import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveReminders } from '@/firebase/profile-operations';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import {
  addMinutes,
  describeReminder,
  ensurePermission,
  rescheduleAll,
  WEEKDAY_LABELS,
  type Reminder,
} from '@/lib/reminders';

/**
 * Una casilla de dos dígitos de la hora. Lleva borrador propio porque, sin él,
 * no se puede vaciar para escribir otra cosa: al borrar el «1» de las 12 el
 * valor se recortaría a un número y volvería a pintarse al instante.
 * Se confirma al salir del campo, así que Firestore recibe una escritura y no
 * una por tecla.
 */
function TimeField({
  value,
  max,
  label,
  onCommit,
}: {
  value: number;
  max: number;
  label: string;
  onCommit: (n: number) => void;
}) {
  const c = useTheme();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextInput
      value={draft ?? String(value).padStart(2, '0')}
      onFocus={() => setDraft(String(value))}
      onChangeText={(t) => {
        const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
        setDraft(clean);
        // Se confirma en cada tecla, no al salir del campo: si se teclea la
        // hora y se sale de la pantalla de golpe, con el blur se perdería.
        // Son dos dígitos, así que son dos escrituras como mucho.
        const n = Number.parseInt(clean, 10);
        if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(0, n)));
      }}
      // El blur solo limpia el borrador para que se repinte «09» en vez de «9».
      onBlur={() => setDraft(null)}
      keyboardType="number-pad"
      selectTextOnFocus
      maxLength={2}
      style={{ width: 30, textAlign: 'center', fontSize: 19, color: c.ink, fontFamily: Fonts.serif, padding: 0 }}
      accessibilityLabel={label}
    />
  );
}

/**
 * Recordatorios que escribe el usuario. Vive en Perfil y no en la entrevista
 * porque no son gustos de comida: se editan a menudo y no tienen nada que ver
 * con cómo se planifica la semana.
 *
 * El aviso lo lanza el móvil, no un servidor: sin coste, sin internet y sin
 * cuenta de push. A cambio solo existe en este teléfono, por eso el texto se
 * guarda también en el perfil.
 */
export default function RecordatoriosScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { profile } = useProfile();

  const [items, setItems] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Copia síncrona de `items`. Los cambios se calculan sobre ESTO, no sobre el
   * estado: dos toques seguidos (poner el domingo y subir la hora) caen en el
   * mismo render, y leyendo del estado el segundo pisaría al primero.
   */
  const itemsRef = useRef<Reminder[]>([]);

  // Una sola carga desde el perfil: después manda el estado local, que es lo
  // que se está editando.
  useEffect(() => {
    if (loaded || !profile) return;
    const initial = (profile.reminders ?? []) as Reminder[];
    itemsRef.current = initial;
    setItems(initial);
    setLoaded(true);
  }, [profile, loaded]);

  /** Guarda en el perfil y reprograma los avisos del sistema. */
  const save = async (next: Reminder[]) => {
    setError(null);
    if (!user) return;
    try {
      await saveReminders(user.uid, next);
      if (next.some((r) => r.enabled)) {
        const granted = await ensurePermission();
        setDenied(!granted);
        if (!granted) return;
      }
      await rescheduleAll(next);
    } catch {
      setError('Se ha guardado, pero no he podido programar los avisos. Revisa los permisos de notificaciones.');
    }
  };

  /** Único punto de cambio: actualiza la ref, la pantalla y el guardado. */
  const apply = (updater: (prev: Reminder[]) => Reminder[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    void save(next);
  };

  const add = () =>
    apply((prev) => [
      ...prev,
      { id: `${Date.now()}`, text: '', hour: 9, minute: 0, repeat: 'diario', enabled: true },
    ]);

  const patch = (id: string, change: Partial<Reminder>) =>
    apply((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)));

  const remove = (id: string) => apply((prev) => prev.filter((r) => r.id !== id));

  /** Empujoncito de 15 minutos, con acarreo a la hora. */
  const bumpMinute = (r: Reminder, d: number) => patch(r.id, addMinutes(r.hour, r.minute, d));

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={17} color={c.inkSoft} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>Recordatorios</Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Chefie te avisa de lo que tú le digas
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
            <ChefieMascot pose="point" size={104} />
            <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', lineHeight: 19 }}>
              Escribe lo que quieras que te recuerde y cuándo. Por ejemplo: «saca el pollo del congelador» los domingos
              a las nueve.
            </Text>
          </View>
        ) : null}

        {denied ? (
          <View style={[styles.note, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
            <Text style={{ fontSize: 12.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 18 }}>
              No tengo permiso para avisarte. Actívalo en los ajustes del móvil, en las notificaciones de Nutrilp, y
              vuelve aquí.
            </Text>
          </View>
        ) : null}

        {items.map((r) => (
          <View key={r.id} style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: c.line, color: c.ink, fontFamily: Fonts.sans }]}
                value={r.text}
                // Al teclear solo se pinta; se guarda al soltar el campo, para
                // no escribir en Firestore letra a letra.
                onChangeText={(t) => {
                  itemsRef.current = itemsRef.current.map((x) => (x.id === r.id ? { ...x, text: t } : x));
                  setItems(itemsRef.current);
                }}
                onEndEditing={() => apply((prev) => prev)}
                placeholder="Saca el pollo del congelador"
                placeholderTextColor={c.inkSoft}
                accessibilityLabel="Texto del recordatorio"
              />
              <Switch
                value={r.enabled}
                onValueChange={(v) => patch(r.id, { enabled: v })}
                trackColor={{ true: c.terra, false: c.line }}
                accessibilityLabel={r.enabled ? 'Desactivar este recordatorio' : 'Activar este recordatorio'}
              />
            </View>

            {/* Hora. Se escribe directamente — antes solo se podía mover a
                saltos y no había forma de poner las 12:10 exactas. Los ±15
                quedan porque para un ajuste pequeño son más rápidos. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>A las</Text>
              <View style={[styles.timeBox, { borderColor: c.line }]}>
                <TimeField value={r.hour} max={23} label="Hora" onCommit={(h) => patch(r.id, { hour: h })} />
                <Text style={{ fontSize: 19, color: c.inkSoft, fontFamily: Fonts.serif }}>:</Text>
                <TimeField value={r.minute} max={59} label="Minutos" onCommit={(m) => patch(r.id, { minute: m })} />
              </View>
              <Pressable onPress={() => bumpMinute(r, -15)} style={[styles.roundBtn, { borderColor: c.line }]} accessibilityRole="button" accessibilityLabel="Quince minutos menos">
                <Ionicons name="remove" size={14} color={c.inkSoft} />
              </Pressable>
              <Pressable onPress={() => bumpMinute(r, 15)} style={[styles.roundBtn, { borderColor: c.line }]} accessibilityRole="button" accessibilityLabel="Quince minutos más">
                <Ionicons name="add" size={14} color={c.inkSoft} />
              </Pressable>
            </View>

            {/* Cada cuánto */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['diario', 'semanal'] as const).map((rep) => (
                <Pressable
                  key={rep}
                  onPress={() => patch(r.id, { repeat: rep, weekday: rep === 'semanal' ? (r.weekday ?? 0) : undefined })}
                  style={[
                    styles.chip,
                    { borderColor: r.repeat === rep ? c.terra : c.line, backgroundColor: r.repeat === rep ? c.terraSoft : 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: r.repeat === rep }}
                >
                  <Text style={{ fontSize: 12, color: c.ink, fontFamily: Fonts.sans }}>
                    {rep === 'diario' ? 'Todos los días' : 'Un día concreto'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {r.repeat === 'semanal' ? (
              <View style={styles.dayRow}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <Pressable
                    key={label}
                    onPress={() => patch(r.id, { weekday: i })}
                    style={[
                      styles.dayChip,
                      { borderColor: r.weekday === i ? c.terra : c.line, backgroundColor: r.weekday === i ? c.terraSoft : 'transparent' },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: r.weekday === i }}
                    accessibilityLabel={label}
                  >
                    <Text style={{ fontSize: 11.5, color: c.ink, fontFamily: Fonts.sans }}>{label.slice(0, 1)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                {r.enabled ? describeReminder(r) : 'Desactivado'}
              </Text>
              <Pressable onPress={() => remove(r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Borrar este recordatorio">
                <Ionicons name="trash-outline" size={16} color={c.terra} />
              </Pressable>
            </View>
          </View>
        ))}

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

        <Pressable
          onPress={add}
          style={[styles.addBtn, Shadows.card, { backgroundColor: c.terra }]}
          accessibilityRole="button"
          accessibilityLabel="Añadir un recordatorio"
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
            Nuevo recordatorio
          </Text>
        </Pressable>

        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16, textAlign: 'center' }}>
          Los avisos los lanza tu móvil, así que funcionan sin internet. Si cambias de teléfono, se vuelven a poner al
          entrar aquí.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  iconBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 10 },
  card: { borderWidth: 1.5, borderRadius: Radii.panel, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  note: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10 },
  input: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13.5 },
  roundBtn: { width: 28, height: 28, borderWidth: 1.2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chip: { borderWidth: 1.2, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 6 },
  dayRow: { flexDirection: 'row', gap: 5 },
  dayChip: { flex: 1, borderWidth: 1.2, borderRadius: 9, paddingVertical: 7, alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    gap: 7,
    borderRadius: Radii.card,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});

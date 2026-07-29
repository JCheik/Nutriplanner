import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveShoppingList } from '@/firebase/plan-operations';
import { useProfile, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { generateShoppingListFromPlan, getShoppingCategory } from '@/lib/shopping-list-utils';
import { pluralizeUnit } from '@/lib/utils';
import type { ShoppingListItem } from '@/lib/types';

/**
 * Compra — pestaña 4. Estilo pósit, como en la web: una hoja amarilla con rayas
 * por pasillo del súper y los artículos escritos a mano (Fonts.hand, el
 * equivalente al Kalam de la web). Nada de tarjetas ni recuadros: es una lista
 * de la compra de papel, se tacha tocándola.
 * El agrupado usa la misma `getShoppingCategory` que la web, así los dos
 * ordenan idéntico. La lista vive en el perfil, compartida entre app y web.
 */
export default function CompraScreen() {
  const c = useTheme();
  const { user } = useAuthUser();
  const { profile, loading } = useProfile();
  const { weekPlan } = useWeekPlan();
  const [manualName, setManualName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => profile?.shoppingList ?? [], [profile]);

  // Agrupado por pasillo, conservando el orden en que llegan dentro de cada uno.
  const sections = useMemo(() => {
    const byAisle = new Map<string, ShoppingListItem[]>();
    items.forEach((item) => {
      const aisle = getShoppingCategory(item.name);
      const list = byAisle.get(aisle) ?? [];
      list.push(item);
      byAisle.set(aisle, list);
    });
    return [...byAisle.entries()];
  }, [items]);

  const persist = (next: ShoppingListItem[]) => {
    if (!user) return;
    setError(null);
    saveShoppingList(user.uid, next).catch(() => setError('No se pudo guardar el cambio. Revisa tu conexión.'));
  };

  const handleGenerate = () => {
    const generated = generateShoppingListFromPlan(weekPlan);
    // Conserva todo lo que no venga del generador (ids `gen-N`), lo añadiera
    // a mano la app o la web.
    const manual = items.filter((i) => !i.id.startsWith('gen-'));
    persist([...generated, ...manual]);
  };

  const toggle = (id: string) => persist(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));

  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    persist([...items, { id: `manual-${Date.now().toString(36)}`, name, quantity: 0, unit: '', checked: false }]);
    setManualName('');
  };

  const pending = items.filter((i) => !i.checked).length;

  return (
    <ScreenScaffold
      eyebrow="Del plan al súper"
      title="Compra"
      subtitle={items.length ? `${pending} por comprar de ${items.length}` : undefined}
    >
      <Pressable
        onPress={handleGenerate}
        style={[styles.generate, { backgroundColor: c.terra }]}
        accessibilityRole="button"
        accessibilityLabel="Generar desde el plan"
      >
        <Ionicons name="refresh" size={16} color="#FFF" />
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
          Generar desde el plan
        </Text>
      </Pressable>
      <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
        La lista no se actualiza sola: si cambias el plan, vuelve a generarla.
      </Text>

      {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

      {!loading && items.length === 0 ? (
        <View style={[styles.sheet, { backgroundColor: c.note, borderColor: c.noteEdge }]}>
          <Text style={[styles.hand, styles.sheetTitle, { color: c.notePencil }]}>Tu lista está vacía</Text>
          <View style={[styles.rule, { backgroundColor: c.noteEdge }]} />
          <Text style={[styles.hand, { color: c.notePencil, opacity: 0.75 }]}>
            Genérala desde tu plan con el botón de arriba, o apunta algo a mano abajo.
          </Text>
        </View>
      ) : (
        sections.map(([aisle, aisleItems], sheetIdx) => (
          <View
            key={aisle}
            style={[
              styles.sheet,
              {
                backgroundColor: c.note,
                borderColor: c.noteEdge,
                // Ligerísima inclinación alterna: aire de nota pegada en la nevera.
                transform: [{ rotate: sheetIdx % 2 === 0 ? '-0.35deg' : '0.35deg' }],
              },
            ]}
          >
            <Text style={[styles.hand, styles.sheetTitle, { color: c.notePencil }]}>{aisle}</Text>
            <View style={[styles.rule, { backgroundColor: c.noteEdge }]} />

            {aisleItems.map((item) => {
              const isWeight = ['g', 'ml', ''].includes((item.unit || '').toLowerCase());
              const qty =
                item.quantity > 0
                  ? isWeight
                    ? `${Math.round(item.quantity)} ${item.unit || 'g'}`
                    : `${item.quantity} ${pluralizeUnit(item.unit, item.quantity)}`
                  : '';
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  style={[styles.line, { borderBottomColor: c.noteEdge }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={item.name}
                >
                  <View style={[styles.box, { borderColor: c.notePencil }]}>
                    {item.checked ? <Ionicons name="checkmark" size={13} color={c.notePencil} /> : null}
                  </View>
                  <Text
                    style={[
                      styles.hand,
                      styles.lineText,
                      { color: c.notePencil },
                      item.checked && { textDecorationLine: 'line-through', opacity: 0.5 },
                    ]}
                    numberOfLines={2}
                  >
                    {qty ? <Text style={{ fontFamily: Fonts.handBold }}>{qty} </Text> : null}
                    {item.name}
                    {item.brand ? <Text style={{ opacity: 0.7 }}> · {item.brand}</Text> : null}
                  </Text>
                  <Pressable
                    onPress={() => remove(item.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Borrar ${item.name}`}
                  >
                    <Ionicons name="close" size={14} color={c.notePencil} style={{ opacity: 0.45 }} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      {/* Apuntar a mano: una línea más del cuaderno. */}
      <View style={[styles.sheet, { backgroundColor: c.note, borderColor: c.noteEdge }]}>
        <View style={[styles.line, styles.lineLast]}>
          <Ionicons name="pencil" size={13} color={c.notePencil} style={{ opacity: 0.55 }} />
          <TextInput
            style={[styles.hand, styles.lineText, styles.input, { color: c.notePencil }]}
            placeholder="Apuntar algo más…"
            placeholderTextColor={c.inkSoft}
            value={manualName}
            onChangeText={setManualName}
            onSubmitEditing={addManual}
            returnKeyType="done"
          />
          <Pressable
            onPress={addManual}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Añadir artículo"
          >
            <Ionicons name="add" size={20} color={c.notePencil} />
          </Pressable>
        </View>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  generate: {
    flexDirection: 'row',
    gap: 7,
    borderRadius: Radii.card,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hoja de pósit: amarillo, esquina apenas redondeada y sombra corta de papel.
  sheet: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    // RN 0.86 cross-platform box shadow (shadow*/elevation are deprecated).
    boxShadow: '0 2px 6px rgba(58, 36, 20, 0.18)',
  },
  hand: { fontFamily: Fonts.hand, fontSize: 16.5, lineHeight: 23 },
  sheetTitle: { fontFamily: Fonts.handBold, fontSize: 18 },
  rule: { height: 1.5, marginTop: 3, marginBottom: 2, opacity: 0.9 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 38,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  lineLast: { borderBottomWidth: 0 },
  lineText: { flex: 1 },
  input: { paddingVertical: 0 },
  box: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

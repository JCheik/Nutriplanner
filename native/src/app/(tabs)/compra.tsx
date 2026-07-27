import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, CardText, ScreenScaffold } from '@/components/screen-scaffold';
import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveShoppingList } from '@/firebase/plan-operations';
import { useProfile, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { generateShoppingListFromPlan, getShoppingCategory } from '@/lib/shopping-list-utils';
import { pluralizeUnit } from '@/lib/utils';
import type { ShoppingListItem } from '@/lib/types';

/**
 * Compra — pestaña 4 (boceto 8). Artículos como pósits en cuadrícula, agrupados
 * por pasillo del súper igual que en la web (misma función `getShoppingCategory`,
 * así los dos sitios ordenan idéntico). La lista vive en el perfil, compartida.
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

      {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

      {!loading && items.length === 0 ? (
        <Card>
          <CardText bold>Tu lista está vacía</CardText>
          <CardText>Genérala desde tu plan con el botón de arriba, o añade artículos a mano abajo.</CardText>
        </Card>
      ) : (
        sections.map(([aisle, aisleItems]) => (
          <View key={aisle} style={{ gap: 7 }}>
            <Text style={[styles.aisle, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{aisle.toUpperCase()}</Text>
            <View style={styles.grid}>
              {aisleItems.map((item, idx) => {
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
                    style={[
                      styles.postit,
                      {
                        backgroundColor: item.checked ? c.sageSoft : c.terraSoft,
                        borderColor: item.checked ? c.sage : c.terra,
                        // Ligerísima inclinación alterna: aire de nota pegada.
                        transform: [{ rotate: idx % 2 === 0 ? '-0.7deg' : '0.7deg' }],
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.checked }}
                    accessibilityLabel={item.name}
                  >
                    <View style={styles.postitTop}>
                      <Text
                        style={[
                          { flex: 1, fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans, lineHeight: 17 },
                          item.checked && { textDecorationLine: 'line-through', color: c.inkSoft },
                        ]}
                        numberOfLines={3}
                      >
                        {item.name}
                      </Text>
                      <Pressable
                        onPress={() => remove(item.id)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Borrar ${item.name}`}
                      >
                        <Ionicons name="close" size={13} color={c.inkSoft} />
                      </Pressable>
                    </View>
                    {item.brand ? (
                      <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    ) : null}
                    <View style={styles.postitBottom}>
                      <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{qty}</Text>
                      {item.checked ? <Ionicons name="checkmark-circle" size={16} color={c.sage} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}

      <View style={styles.manualRow}>
        <TextInput
          style={[
            styles.manualInput,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder="Añadir artículo a mano…"
          placeholderTextColor={c.inkSoft}
          value={manualName}
          onChangeText={setManualName}
          onSubmitEditing={addManual}
        />
        <Pressable
          onPress={addManual}
          style={[styles.manualBtn, { borderColor: c.terra }]}
          accessibilityRole="button"
          accessibilityLabel="Añadir artículo"
        >
          <Ionicons name="add" size={20} color={c.terra} />
        </Pressable>
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
  aisle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postit: {
    width: '47.5%',
    minHeight: 78,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
    justifyContent: 'space-between',
  },
  postitTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  postitBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  manualRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  manualInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  manualBtn: { width: 44, borderWidth: 1.5, borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center' },
});

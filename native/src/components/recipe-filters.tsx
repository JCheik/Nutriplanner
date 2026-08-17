import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DIET_TAGS, MEAL_CATEGORIES } from '@/lib/constants';
import type { DietTag, MealCategory, Recipe } from '@/lib/types';
import { perServingMacros } from '@/lib/serving-utils';

export type SortKey = 'nuevas' | 'nombre' | 'calorias' | 'proteina';

export const SORT_LABELS: Record<SortKey, string> = {
  nuevas: 'Nuevas primero',
  nombre: 'Nombre',
  calorias: 'Menos calorías',
  proteina: 'Más proteína',
};

/**
 * Cuánto dura el cartel de "NUEVA". Una semana: lo justo para volver a la app
 * al día siguiente y reconocer lo que importaste, sin que el recetario acabe
 * lleno de etiquetas.
 */
const NUEVA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * ¿Se añadió hace poco? Las recetas anteriores al campo `createdAt` no lo son,
 * que es lo correcto: son justamente las 130 entre las que hay que distinguir.
 */
export function isRecentRecipe(r: Recipe, now = Date.now()): boolean {
  if (!r.createdAt) return false;
  const t = Date.parse(r.createdAt);
  return Number.isFinite(t) && now - t < NUEVA_MS;
}

export interface RecipeFilterState {
  categories: MealCategory[];
  diets: DietTag[];
  sort: SortKey;
}

/**
 * Por defecto, **lo más nuevo primero**. Estaba en 'nombre', y por eso una receta
 * recién importada caía en mitad del alfabeto y había que buscarla justo cuando
 * menos sabes de ella. Las que no tienen fecha (todo lo anterior al campo, y el
 * recetario de Nutrilp entero) quedan detrás, ordenadas por nombre entre ellas
 * — así que para esa lista no cambia nada.
 */
export const EMPTY_FILTERS: RecipeFilterState = { categories: [], diets: [], sort: 'nuevas' };

export function activeFilterCount(f: RecipeFilterState): number {
  return f.categories.length + f.diets.length;
}

/** Aplica filtros y orden. Una receta sin categorías es comodín (encaja siempre). */
export function applyRecipeFilters(recipes: Recipe[], f: RecipeFilterState): Recipe[] {
  const filtered = recipes.filter((r) => {
    const cats = r.category ?? [];
    const okCat = f.categories.length === 0 || cats.length === 0 || f.categories.some((c) => cats.includes(c));
    const tags = r.dietTags ?? [];
    const okDiet = f.diets.length === 0 || f.diets.every((d) => tags.includes(d));
    return okCat && okDiet;
  });

  return [...filtered].sort((a, b) => {
    if (f.sort === 'nuevas') {
      // Sin fecha van al final (no delante): son las viejas, y el sentido de
      // este orden es sacar arriba lo que acabas de importar.
      const ta = a.createdAt ? Date.parse(a.createdAt) : -Infinity;
      const tb = b.createdAt ? Date.parse(b.createdAt) : -Infinity;
      if (ta !== tb) return tb - ta;
      return a.name.localeCompare(b.name, 'es');
    }
    if (f.sort === 'calorias') return perServingMacros(a).calories - perServingMacros(b).calories;
    if (f.sort === 'proteina') return perServingMacros(b).protein - perServingMacros(a).protein;
    return a.name.localeCompare(b.name, 'es');
  });
}

function Chip({ label, on, onPress, tone = 'terra' }: { label: string; on: boolean; onPress: () => void; tone?: 'terra' | 'sage' }) {
  const c = useTheme();
  const accent = tone === 'sage' ? c.sage : c.terra;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: on ? accent : c.line, backgroundColor: on ? accent : c.surface },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 11.5, color: on ? '#FFF' : c.inkSoft, fontFamily: Fonts.sans, fontWeight: on ? '700' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Panel de filtros de recetas (bocetos 3 y 6): categoría, dieta y orden, ocultos
 * tras un botón para no comerse la pantalla. Compartido por la biblioteca y por
 * la hoja de "añadir comida".
 */
export function RecipeFilters({
  value,
  onChange,
  open,
  onToggleOpen,
}: {
  value: RecipeFilterState;
  onChange: (next: RecipeFilterState) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const c = useTheme();
  const count = activeFilterCount(value);

  const toggleCategory = (cat: MealCategory) =>
    onChange({
      ...value,
      categories: value.categories.includes(cat)
        ? value.categories.filter((x) => x !== cat)
        : [...value.categories, cat],
    });

  const toggleDiet = (d: DietTag) =>
    onChange({
      ...value,
      diets: value.diets.includes(d) ? value.diets.filter((x) => x !== d) : [...value.diets, d],
    });

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onToggleOpen}
          style={[
            styles.toolBtn,
            { borderColor: count > 0 ? c.terra : c.line, backgroundColor: count > 0 ? c.terraSoft : c.surface },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
        >
          <Ionicons name="options-outline" size={15} color={count > 0 ? c.terra : c.inkSoft} />
          <Text style={{ fontSize: 12, color: count > 0 ? c.terra : c.inkSoft, fontFamily: Fonts.sans, fontWeight: count > 0 ? '700' : '400' }}>
            Filtros{count > 0 ? ` · ${count}` : ''}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={count > 0 ? c.terra : c.inkSoft} />
        </Pressable>
        {count > 0 ? (
          <Pressable
            onPress={() => onChange({ ...value, categories: [], diets: [] })}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Quitar filtros"
          >
            <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={[styles.panel, { borderColor: c.line, backgroundColor: c.surface }]}>
          <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>TIPO DE COMIDA</Text>
          <View style={styles.chipRow}>
            {MEAL_CATEGORIES.map((cat) => (
              <Chip
                key={cat.value}
                label={cat.label}
                on={value.categories.includes(cat.value as MealCategory)}
                onPress={() => toggleCategory(cat.value as MealCategory)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>DIETA</Text>
          <View style={styles.chipRow}>
            {DIET_TAGS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                tone="sage"
                on={value.diets.includes(d.value as DietTag)}
                onPress={() => toggleDiet(d.value as DietTag)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>ORDENAR POR</Text>
          <View style={styles.chipRow}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <Chip key={k} label={SORT_LABELS[k]} on={value.sort === k} onPress={() => onChange({ ...value, sort: k })} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearBtn: { justifyContent: 'center', paddingHorizontal: 6 },
  panel: { borderWidth: 1.5, borderRadius: Radii.card, padding: 11, gap: 6 },
  label: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.2, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
});

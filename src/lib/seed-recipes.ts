import type { DietTag, Ingredient, MealCategory, Recipe } from '@/lib/types';

/**
 * Tanda de recetas sencillas para arrancar el recetario.
 *
 * Los macros NO están escritos a mano: se declara cada alimento por 100 g una
 * sola vez en `FOODS` y los totales de cada receta se CALCULAN de sus
 * ingredientes (`expandSeedRecipe`). Escribir "520 kcal" a ojo en 30 recetas es
 * garantía de que varias estén mal y de que nadie lo note; así, si un número
 * chirría, se arregla el alimento y se corrigen todas a la vez.
 *
 * Los valores por 100 g son de referencia estándar para producto crudo salvo
 * donde se indica. Son estimaciones razonables de tabla, no análisis de
 * laboratorio: para cocinar y planificar sobran, y el usuario puede afinarlos
 * luego desde el catálogo.
 */

export interface SeedFood {
  /** Por 100 g o 100 ml. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Unidad natural, para poder poner "2 huevos" en vez de "120 g". */
  unitName?: string;
  unitWeight?: number;
}

export const FOODS: Record<string, SeedFood> = {
  // ── Huevos y lácteos ──────────────────────────────────────────────────────
  'Huevo': { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0, unitName: 'huevo', unitWeight: 60 },
  'Leche semidesnatada': { calories: 46, protein: 3.2, carbs: 4.8, fat: 1.6, fiber: 0 },
  'Yogur natural': { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
  'Yogur griego natural': { calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0 },
  'Requesón': { calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
  'Queso crema': { calories: 253, protein: 6, carbs: 4, fat: 24, fiber: 0 },
  'Queso curado': { calories: 400, protein: 25, carbs: 1.4, fat: 33, fiber: 0 },
  'Queso rallado': { calories: 380, protein: 26, carbs: 2, fat: 30, fiber: 0 },

  // ── Carnes y pescados ─────────────────────────────────────────────────────
  'Pechuga de pollo': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  'Muslo de pollo': { calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0 },
  'Pechuga de pavo en lonchas': { calories: 104, protein: 18, carbs: 1.5, fat: 2.5, fiber: 0, unitName: 'loncha', unitWeight: 25 },
  'Jamón serrano': { calories: 241, protein: 31, carbs: 0.3, fat: 13, fiber: 0, unitName: 'loncha', unitWeight: 20 },
  'Jamón cocido': { calories: 107, protein: 18, carbs: 1.5, fat: 3.3, fiber: 0, unitName: 'loncha', unitWeight: 25 },
  'Bacon': { calories: 393, protein: 24, carbs: 0.6, fat: 33, fiber: 0 },
  'Ternera magra': { calories: 158, protein: 26, carbs: 0, fat: 6, fiber: 0 },
  'Merluza': { calories: 89, protein: 17, carbs: 0, fat: 2.3, fiber: 0 },
  'Salmón fresco': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  'Salmón ahumado': { calories: 180, protein: 25, carbs: 0, fat: 9, fiber: 0 },
  'Atún al natural': { calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 },

  // ── Cereales, legumbres y tubérculos ──────────────────────────────────────
  'Pan integral': { calories: 247, protein: 9, carbs: 41, fat: 3.4, fiber: 6, unitName: 'rebanada', unitWeight: 35 },
  'Pan de centeno': { calories: 259, protein: 8.5, carbs: 48, fat: 3.3, fiber: 6, unitName: 'rebanada', unitWeight: 35 },
  'Copos de avena': { calories: 375, protein: 13, carbs: 59, fat: 7, fiber: 10 },
  'Arroz blanco crudo': { calories: 360, protein: 7, carbs: 79, fat: 0.6, fiber: 1.3 },
  'Pasta seca': { calories: 356, protein: 12.5, carbs: 71, fat: 1.5, fiber: 3 },
  'Patata':{ calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2 },
  'Lenteja pardina seca': { calories: 336, protein: 24, carbs: 49, fat: 1.5, fiber: 11 },
  'Garbanzo cocido': { calories: 139, protein: 7.5, carbs: 18, fat: 2.6, fiber: 6 },
  'Hummus': { calories: 237, protein: 7.4, carbs: 14, fat: 17, fiber: 6 },

  // ── Verduras y frutas ─────────────────────────────────────────────────────
  'Tomate': { calories: 18, protein: 0.9, carbs: 3.5, fat: 0.2, fiber: 1.2 },
  'Tomate cherry': { calories: 18, protein: 0.9, carbs: 3.5, fat: 0.2, fiber: 1.2 },
  'Tomate triturado': { calories: 29, protein: 1.3, carbs: 5.4, fat: 0.3, fiber: 1.4 },
  'Cebolla': { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7, unitName: 'cebolla', unitWeight: 150 },
  'Ajo': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, unitName: 'diente', unitWeight: 3 },
  'Pimiento rojo': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  'Zanahoria': { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  'Calabacín': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1 },
  'Espinaca fresca': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  'Espárrago verde': { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1 },
  'Lechuga': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  'Aguacate': { calories: 160, protein: 2, carbs: 8.5, fat: 15, fiber: 6.7, unitName: 'aguacate', unitWeight: 150 },
  'Plátano': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, unitName: 'plátano', unitWeight: 120 },
  'Manzana': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, unitName: 'manzana', unitWeight: 180 },
  'Frutos rojos congelados': { calories: 45, protein: 0.8, carbs: 9, fat: 0.4, fiber: 3 },
  'Limón': { calories: 29, protein: 1.1, carbs: 9, fat: 0.3, fiber: 2.8, unitName: 'limón', unitWeight: 100 },

  // ── Grasas, frutos secos y otros ──────────────────────────────────────────
  'Aceite de oliva virgen extra': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  'Almendra cruda': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  'Nuez': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7 },
  'Crema de cacahuete': { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
  'Proteína en polvo': { calories: 380, protein: 78, carbs: 6, fat: 5, fiber: 1 },
  'Sal':{ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  'Pimienta negra molida': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25 },
  'Canela molida': { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53 },
  'Pimentón dulce': { calories: 282, protein: 14, carbs: 54, fat: 13, fiber: 35 },
  'Orégano seco': { calories: 265, protein: 9, carbs: 69, fat: 4.3, fiber: 43 },
  'Romero fresco': { calories: 131, protein: 3.3, carbs: 21, fat: 5.9, fiber: 14 },
  'Vinagre de vino': { calories: 19, protein: 0, carbs: 0.3, fat: 0, fiber: 0 },
};

export interface SeedIngredient {
  /** Clave de `FOODS`. */
  food: keyof typeof FOODS;
  /** En gramos/ml, o en piezas si el alimento tiene `unitName`. */
  quantity: number;
  /** Se usa la unidad natural del alimento (huevo, loncha…) en vez de gramos. */
  byUnit?: boolean;
}

export interface SeedRecipe {
  name: string;
  description: string;
  instructions: string[];
  /** Raciones que salen del lote. */
  servings: number;
  category: MealCategory[];
  dietTags: DietTag[];
  ingredients: SeedIngredient[];
}

/**
 * Las 30 recetas. Criterio: que se puedan hacer sin saber cocinar y sin
 * cacharros raros — sartén, horno o nada.
 *
 * Las etiquetas de dieta importan de verdad, no son decorado: el autocompletado
 * descarta las recetas cuyas etiquetas no encajan con la dieta del usuario, así
 * que un plato con carne DEBE llevar 'omnivora'. Sin etiqueta sería un comodín
 * y acabaría en el plan de alguien vegetariano.
 */
export const SEED_RECIPES: SeedRecipe[] = [
  // ══ DESAYUNOS ═══════════════════════════════════════════════════════════
  {
    name: 'Tostada de tomate y jamón serrano',
    description: 'El desayuno de toda la vida, en tres minutos.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['omnivora'],
    instructions: [
      'Tuesta el pan.',
      'Ralla el tomate y repártelo por encima.',
      'Riega con el aceite, pon una pizca de sal y coloca el jamón.',
    ],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Tomate', quantity: 80 },
      { food: 'Aceite de oliva virgen extra', quantity: 8 },
      { food: 'Jamón serrano', quantity: 2, byUnit: true },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tortilla francesa con jamón cocido',
    description: 'Dos huevos, una sartén y listo.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['omnivora'],
    instructions: [
      'Bate los huevos con una pizca de sal.',
      'Corta el jamón en tiras y mézclalo con el huevo.',
      'Calienta el aceite y cuaja la tortilla 2 minutos por cada lado.',
    ],
    ingredients: [
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Jamón cocido', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tostada de salmón ahumado y queso crema',
    description: 'Sin cocinar nada. Queda de desayuno de hotel.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['omnivora'],
    instructions: [
      'Tuesta el pan de centeno.',
      'Unta el queso crema.',
      'Cubre con el salmón y añade pimienta al gusto.',
    ],
    ingredients: [
      { food: 'Pan de centeno', quantity: 2, byUnit: true },
      { food: 'Queso crema', quantity: 30 },
      { food: 'Salmón ahumado', quantity: 60 },
      { food: 'Pimienta negra molida', quantity: 0.5 },
    ],
  },
  {
    name: 'Huevos revueltos con bacon',
    description: 'Desayuno contundente y sin hidratos.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['omnivora', 'keto'],
    instructions: [
      'Dora el bacon en la sartén sin aceite hasta que suelte su grasa.',
      'Baja el fuego, añade los huevos batidos con sal.',
      'Remueve sin parar 1 minuto y retíralos cuando aún estén cremosos.',
    ],
    ingredients: [
      { food: 'Huevo', quantity: 3, byUnit: true },
      { food: 'Bacon', quantity: 40 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Porridge de avena con plátano',
    description: 'Se hace en el microondas mientras te vistes.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana'],
    instructions: [
      'Mezcla la avena con la leche en un bol hondo.',
      'Microondas 2 minutos a máxima potencia, removiendo a la mitad.',
      'Añade el plátano en rodajas y la canela por encima.',
    ],
    ingredients: [
      { food: 'Copos de avena', quantity: 50 },
      { food: 'Leche semidesnatada', quantity: 200 },
      { food: 'Plátano', quantity: 1, byUnit: true },
      { food: 'Canela molida', quantity: 1 },
    ],
  },
  {
    name: 'Yogur griego con frutos rojos y nueces',
    description: 'Cero cocina: se monta en el bol y ya está.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana'],
    instructions: [
      'Pon el yogur en un bol.',
      'Añade los frutos rojos (si son congelados, un minuto de microondas).',
      'Termina con las nueces troceadas.',
    ],
    ingredients: [
      { food: 'Yogur griego natural', quantity: 200 },
      { food: 'Frutos rojos congelados', quantity: 80 },
      { food: 'Nuez', quantity: 20 },
    ],
  },
  {
    name: 'Tostada de aguacate y huevo',
    description: 'Medio aguacate y un huevo a la plancha.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana'],
    instructions: [
      'Tuesta el pan y aplasta el aguacate encima con un tenedor.',
      'Haz el huevo a la plancha con el aceite.',
      'Ponlo sobre el aguacate y salpimenta.',
    ],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Aguacate', quantity: 75 },
      { food: 'Huevo', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Batido de plátano y crema de cacahuete',
    description: 'Para desayunar de camino. Un minuto de batidora.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana'],
    instructions: [
      'Mete todo en la batidora.',
      'Bate 30 segundos hasta que no queden grumos.',
    ],
    ingredients: [
      { food: 'Leche semidesnatada', quantity: 250 },
      { food: 'Plátano', quantity: 1, byUnit: true },
      { food: 'Crema de cacahuete', quantity: 20 },
    ],
  },
  {
    name: 'Revuelto de huevo, queso y espinacas',
    description: 'Una sartén, cinco minutos y sin hidratos.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana', 'keto'],
    instructions: [
      'Saltea las espinacas con el aceite hasta que bajen de volumen.',
      'Añade los huevos batidos con sal y remueve a fuego suave.',
      'Fuera del fuego, mezcla el queso rallado para que funda.',
    ],
    ingredients: [
      { food: 'Huevo', quantity: 3, byUnit: true },
      { food: 'Espinaca fresca', quantity: 80 },
      { food: 'Queso rallado', quantity: 30 },
      { food: 'Aceite de oliva virgen extra', quantity: 10 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Requesón con nueces y canela',
    description: 'Sin fuego. Mucha proteína y casi nada de azúcar.',
    servings: 1,
    category: ['desayuno'],
    dietTags: ['vegetariana', 'keto'],
    instructions: [
      'Pon el requesón en un bol.',
      'Añade las nueces troceadas y espolvorea la canela.',
    ],
    ingredients: [
      { food: 'Requesón', quantity: 150 },
      { food: 'Nuez', quantity: 25 },
      { food: 'Canela molida', quantity: 1 },
    ],
  },

  // ══ ALMUERZOS ═══════════════════════════════════════════════════════════
  {
    name: 'Pollo al horno con patatas y limón',
    description: 'Se mete todo en la bandeja y lo hace el horno.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora'],
    instructions: [
      'Precalienta el horno a 200 ºC.',
      'Corta las patatas en rodajas gruesas y ponlas en la bandeja con el ajo.',
      'Coloca el pollo encima, riega con el aceite y el zumo del limón, y sala.',
      'Hornea 50 minutos, dándole la vuelta al pollo a la mitad.',
    ],
    ingredients: [
      { food: 'Muslo de pollo', quantity: 600 },
      { food: 'Patata', quantity: 600 },
      { food: 'Limón', quantity: 1, byUnit: true },
      { food: 'Ajo', quantity: 4, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Romero fresco', quantity: 3 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Merluza al horno con verduras',
    description: 'Pescado fácil que no se seca. Sale en 25 minutos.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora'],
    instructions: [
      'Precalienta el horno a 190 ºC.',
      'Corta la patata en rodajas finas y hornéala sola 15 minutos.',
      'Añade el calabacín, el tomate y la cebolla en rodajas por encima.',
      'Coloca los lomos de merluza, riega con el aceite y sala.',
      'Hornea 20-25 minutos más.',
    ],
    ingredients: [
      { food: 'Merluza', quantity: 600 },
      // La patata no es adorno: sin ella la ración se quedaba en 226 kcal, muy
      // poco para una comida principal, y el autocompletado tendría que poner
      // tres raciones (450 g de pescado) para llegar a un objetivo normal.
      { food: 'Patata', quantity: 450 },
      { food: 'Calabacín', quantity: 300 },
      { food: 'Tomate', quantity: 200 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Arroz con pollo y verduras',
    description: 'Plato único de una sola cazuela.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora'],
    instructions: [
      'Dora el pollo troceado con el aceite en una cazuela ancha.',
      'Añade la cebolla y el pimiento picados y sofríe 5 minutos.',
      'Echa el arroz, remueve y cubre con el doble de agua caliente.',
      'Sala y cuece 18 minutos a fuego medio sin remover.',
    ],
    ingredients: [
      { food: 'Arroz blanco crudo', quantity: 300 },
      { food: 'Pechuga de pollo', quantity: 500 },
      { food: 'Pimiento rojo', quantity: 150 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Pasta con atún y tomate',
    description: 'La cena de emergencia de la despensa.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora'],
    instructions: [
      'Cuece la pasta el tiempo que diga el paquete.',
      'Mientras, sofríe el ajo picado en el aceite y añade el tomate triturado.',
      'Cuece la salsa 10 minutos, añade el atún escurrido y mezcla con la pasta.',
    ],
    ingredients: [
      { food: 'Pasta seca', quantity: 320 },
      { food: 'Atún al natural', quantity: 240 },
      { food: 'Tomate triturado', quantity: 300 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Ensalada de garbanzos con atún',
    description: 'Sin encender el fuego. Aguanta bien en el táper.',
    servings: 4,
    category: ['almuerzo'],
    dietTags: ['omnivora'],
    instructions: [
      'Escurre y enjuaga los garbanzos.',
      'Pica el tomate y la cebolla y mézclalo todo con el atún.',
      'Aliña con el aceite, el vinagre y la sal.',
    ],
    ingredients: [
      { food: 'Garbanzo cocido', quantity: 480 },
      { food: 'Atún al natural', quantity: 200 },
      { food: 'Tomate', quantity: 200 },
      { food: 'Cebolla', quantity: 75 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Vinagre de vino', quantity: 10 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Lentejas estofadas con verduras',
    description: 'De cuchara, de las de siempre. Aguantan días en la nevera.',
    servings: 4,
    category: ['almuerzo'],
    dietTags: ['vegetariana'],
    instructions: [
      'Sofríe la cebolla, la zanahoria y el pimiento picados con el aceite.',
      'Añade el ajo y el pimentón, remueve 20 segundos para que no se queme.',
      'Echa las lentejas y cubre con agua tres dedos por encima.',
      'Cuece 35 minutos a fuego suave y sala al final.',
    ],
    ingredients: [
      { food: 'Lenteja pardina seca', quantity: 300 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Pimiento rojo', quantity: 100 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Pimentón dulce', quantity: 3 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Salmón a la plancha con espárragos',
    description: 'Diez minutos de sartén. Sin hidratos.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora', 'keto'],
    instructions: [
      'Salpimenta los lomos de salmón.',
      'Plancha 4 minutos por el lado de la piel y 2 por el otro.',
      'En la misma sartén, saltea los espárragos 5 minutos y exprime el limón.',
    ],
    ingredients: [
      // 150 g de salmón por ración: con 125 g la comida se quedaba corta y no
      // se puede compensar con guarnición sin sacarla de keto.
      { food: 'Salmón fresco', quantity: 600 },
      { food: 'Espárrago verde', quantity: 400 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Limón', quantity: 50 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Salteado de ternera con pimientos',
    description: 'Wok rápido a fuego fuerte, listo en 12 minutos.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora', 'keto'],
    instructions: [
      'Corta la ternera en tiras finas y sálala.',
      'Sella la carne a fuego muy fuerte 2 minutos y resérvala.',
      'Saltea el pimiento, la cebolla y el ajo 6 minutos.',
      'Devuelve la carne a la sartén y mezcla 1 minuto más.',
    ],
    ingredients: [
      { food: 'Ternera magra', quantity: 600 },
      { food: 'Pimiento rojo', quantity: 300 },
      { food: 'Cebolla', quantity: 100 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Tortilla de patatas',
    description: 'La de siempre, con cebolla. Fría también está buena.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['vegetariana'],
    instructions: [
      'Pela y corta las patatas en láminas finas, y la cebolla en juliana.',
      'Fríelas a fuego suave en el aceite unos 20 minutos, sin que doren.',
      'Escurre y mézclalas con los huevos batidos y la sal.',
      'Cuaja en la sartén 3 minutos por cada lado.',
    ],
    ingredients: [
      { food: 'Patata', quantity: 800 },
      { food: 'Huevo', quantity: 6, byUnit: true },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 50 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Pollo a la plancha con ensalada',
    description: 'Lo más simple que hay, y siempre funciona.',
    servings: 4,
    category: ['almuerzo', 'cena'],
    dietTags: ['omnivora'],
    instructions: [
      'Salpimenta las pechugas y hazlas a la plancha 5 minutos por cada lado.',
      'Trocea la lechuga y el tomate.',
      'Aliña la ensalada con el aceite, el vinagre y la sal.',
    ],
    ingredients: [
      { food: 'Pechuga de pollo', quantity: 600 },
      { food: 'Lechuga', quantity: 200 },
      { food: 'Tomate', quantity: 200 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Vinagre de vino', quantity: 10 },
      { food: 'Sal', quantity: 4 },
    ],
  },

  // ══ SNACKS ══════════════════════════════════════════════════════════════
  {
    name: 'Yogur natural con almendras',
    description: 'Se monta en veinte segundos.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana'],
    instructions: ['Pon el yogur en un bol y añade las almendras troceadas.'],
    ingredients: [
      { food: 'Yogur natural', quantity: 125 },
      { food: 'Almendra cruda', quantity: 20 },
    ],
  },
  {
    name: 'Manzana con crema de cacahuete',
    description: 'Dulce y salado, sin azúcar añadido.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana'],
    instructions: ['Corta la manzana en gajos.', 'Unta cada gajo con la crema de cacahuete.'],
    ingredients: [
      { food: 'Manzana', quantity: 1, byUnit: true },
      { food: 'Crema de cacahuete', quantity: 15 },
    ],
  },
  {
    name: 'Palitos de zanahoria con hummus',
    description: 'Para picar sin remordimientos delante de la tele.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana'],
    instructions: ['Pela la zanahoria y córtala en bastones.', 'Sírvela con el hummus para mojar.'],
    ingredients: [
      { food: 'Zanahoria', quantity: 120 },
      { food: 'Hummus', quantity: 50 },
    ],
  },
  {
    name: 'Tostada de crema de cacahuete',
    description: 'Una rebanada y a correr.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana'],
    instructions: ['Tuesta el pan.', 'Unta la crema de cacahuete.'],
    ingredients: [
      { food: 'Pan integral', quantity: 1, byUnit: true },
      { food: 'Crema de cacahuete', quantity: 15 },
    ],
  },
  {
    name: 'Huevos duros con sal y pimienta',
    description: 'Se hacen de golpe y aguantan tres días en la nevera.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana', 'keto'],
    instructions: [
      'Cuece los huevos 10 minutos desde que el agua hierve.',
      'Pásalos por agua fría, pélalos y salpimenta.',
    ],
    ingredients: [
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Sal', quantity: 1 },
      { food: 'Pimienta negra molida', quantity: 0.5 },
    ],
  },
  {
    name: 'Lonchas de pavo con queso',
    description: 'Sin cocinar. Mucha proteína y casi cero hidratos.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['omnivora', 'keto'],
    instructions: ['Reparte el queso sobre las lonchas de pavo y enróllalas.'],
    ingredients: [
      { food: 'Pechuga de pavo en lonchas', quantity: 3, byUnit: true },
      { food: 'Queso curado', quantity: 30 },
    ],
  },
  {
    name: 'Queso curado con almendras',
    description: 'El aperitivo de siempre, que además es keto.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana', 'keto'],
    instructions: ['Corta el queso en tacos y sírvelo con las almendras.'],
    ingredients: [
      { food: 'Queso curado', quantity: 40 },
      { food: 'Almendra cruda', quantity: 20 },
    ],
  },
  {
    name: 'Batido de proteína con leche',
    description: 'Para después de entrenar.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['omnivora'],
    instructions: ['Bate la leche con la proteína hasta que no queden grumos.'],
    ingredients: [
      { food: 'Leche semidesnatada', quantity: 250 },
      { food: 'Proteína en polvo', quantity: 30 },
    ],
  },
  {
    name: 'Requesón con tomate cherry',
    description: 'Salado, fresco y con proteína.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['vegetariana'],
    instructions: [
      'Parte los tomates cherry por la mitad.',
      'Mézclalos con el requesón, el aceite, el orégano y la sal.',
    ],
    ingredients: [
      { food: 'Requesón', quantity: 150 },
      { food: 'Tomate cherry', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Orégano seco', quantity: 0.5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Atún al natural con tomate',
    description: 'Una lata, un tomate y un chorro de aceite.',
    servings: 1,
    category: ['snack', 'merienda'],
    dietTags: ['omnivora'],
    instructions: [
      'Escurre la lata de atún.',
      'Pica el tomate, mézclalo con el atún y aliña con aceite y sal.',
    ],
    ingredients: [
      { food: 'Atún al natural', quantity: 120 },
      { food: 'Tomate', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
];

/** Gramos reales que aporta una línea, ya sea en peso o en piezas. */
function gramsOf(ing: SeedIngredient): number {
  const food = FOODS[ing.food];
  if (ing.byUnit) return ing.quantity * (food.unitWeight ?? 1);
  return ing.quantity;
}

/**
 * Pasa una receta semilla al `Recipe` que guarda la app: totales del LOTE
 * (la convención de todo el proyecto, que `perServingMacros` divide después).
 */
export function expandSeedRecipe(seed: SeedRecipe): Omit<Recipe, 'id'> {
  const ingredients: Ingredient[] = seed.ingredients.map((ing, i) => {
    const food = FOODS[ing.food];
    const useUnit = ing.byUnit && food.unitName;
    return {
      id: `ing-${i + 1}`,
      name: ing.food,
      quantity: ing.quantity,
      unit: useUnit ? food.unitName! : 'g',
      ...(useUnit && food.unitWeight ? { unitWeight: food.unitWeight } : {}),
    };
  });

  const totals = seed.ingredients.reduce(
    (acc, ing) => {
      const food = FOODS[ing.food];
      const factor = gramsOf(ing) / 100;
      return {
        calories: acc.calories + food.calories * factor,
        protein: acc.protein + food.protein * factor,
        carbs: acc.carbs + food.carbs * factor,
        fat: acc.fat + food.fat * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    name: seed.name,
    description: seed.description,
    instructions: seed.instructions.join('\n'),
    ingredients,
    servings: seed.servings,
    category: seed.category,
    dietTags: seed.dietTags,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

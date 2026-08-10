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
  'Lenteja pardina seca': { calories: 352, protein: 24, carbs: 60, fat: 1.1, fiber: 11 },
  'Garbanzo cocido': { calories: 139, protein: 7.5, carbs: 22, fat: 2.6, fiber: 6 },
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

  // ── Ampliación (segunda tanda) ────────────────────────────────────────────
  // Lácteos y huevo
  'Kéfir': { calories: 62, protein: 3.5, carbs: 4.5, fat: 3.3, fiber: 0 },
  'Mozzarella': { calories: 280, protein: 22, carbs: 2.2, fat: 20, fiber: 0 },
  'Queso feta': { calories: 264, protein: 14, carbs: 4.1, fat: 21, fiber: 0 },
  'Queso de cabra': { calories: 364, protein: 22, carbs: 2.5, fat: 30, fiber: 0 },
  'Queso azul': { calories: 353, protein: 21, carbs: 2.3, fat: 29, fiber: 0 },
  'Parmesano': { calories: 431, protein: 38, carbs: 4.1, fat: 29, fiber: 0 },
  'Nata para cocinar': { calories: 195, protein: 2.5, carbs: 3.5, fat: 19, fiber: 0 },
  'Mantequilla': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },

  // Carnes y pescados
  'Pechuga de pavo': { calories: 135, protein: 29, carbs: 0, fat: 1.7, fiber: 0 },
  'Lomo de cerdo': { calories: 143, protein: 27, carbs: 0, fat: 3.5, fiber: 0 },
  'Carne picada de ternera': { calories: 200, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  'Chorizo': { calories: 455, protein: 24, carbs: 1.9, fat: 38, fiber: 0 },
  'Gamba pelada': { calories: 85, protein: 20, carbs: 0.2, fat: 0.5, fiber: 0 },
  'Mejillón': { calories: 86, protein: 12, carbs: 3.7, fat: 2.2, fiber: 0 },
  'Bacalao fresco': { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0 },
  'Dorada': { calories: 96, protein: 20, carbs: 0, fat: 1.8, fiber: 0 },
  'Sardina': { calories: 208, protein: 25, carbs: 0, fat: 11, fiber: 0 },
  'Anchoa en aceite': { calories: 210, protein: 29, carbs: 0, fat: 10, fiber: 0 },

  // Proteína vegetal
  'Tofu firme': { calories: 144, protein: 15, carbs: 3, fat: 8, fiber: 2 },
  'Alubia blanca cocida': { calories: 139, protein: 9.7, carbs: 25, fat: 0.5, fiber: 6.3 },
  'Guisante': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5 },
  'Edamame': { calories: 122, protein: 11, carbs: 9, fat: 5, fiber: 5 },

  // Cereales y tubérculos
  'Pan de molde integral': { calories: 245, protein: 9, carbs: 41, fat: 3.5, fiber: 6, unitName: 'rebanada', unitWeight: 30 },
  'Tortilla de trigo': { calories: 310, protein: 8, carbs: 51, fat: 8, fiber: 3, unitName: 'tortilla', unitWeight: 60 },
  'Cuscús seco': { calories: 376, protein: 13, carbs: 77, fat: 0.6, fiber: 5 },
  'Quinoa seca': { calories: 368, protein: 14, carbs: 64, fat: 6, fiber: 7 },
  'Arroz integral crudo': { calories: 362, protein: 7.5, carbs: 76, fat: 2.7, fiber: 3.5 },
  'Boniato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
  'Maíz dulce': { calories: 86, protein: 3.2, carbs: 19, fat: 1.2, fiber: 2.7 },
  'Tortita de arroz': { calories: 387, protein: 8, carbs: 81, fat: 3, fiber: 3, unitName: 'tortita', unitWeight: 8 },

  // Verduras
  'Brócoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  'Coliflor': { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2 },
  'Berenjena': { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3 },
  'Puerro': { calories: 61, protein: 1.5, carbs: 14, fat: 0.3, fiber: 1.8 },
  'Pepino': { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  'Pimiento verde': { calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7 },
  'Cebolla morada': { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7 },
  'Rúcula': { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6 },
  'Canónigos': { calories: 21, protein: 2, carbs: 3.6, fat: 0.4, fiber: 1.5 },
  'Calabaza': { calories: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5 },
  'Champiñón': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
  'Judía verde': { calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4 },
  'Col lombarda': { calories: 31, protein: 1.4, carbs: 7, fat: 0.2, fiber: 2.1 },
  'Aceituna verde': { calories: 145, protein: 1, carbs: 3.8, fat: 15, fiber: 3.3 },

  // Frutas
  'Naranja': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, unitName: 'naranja', unitWeight: 180 },
  'Fresa': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  'Kiwi': { calories: 61, protein: 1.1, carbs: 15, fat: 0.5, fiber: 3, unitName: 'kiwi', unitWeight: 75 },
  'Pera': { calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1, unitName: 'pera', unitWeight: 170 },
  'Melocotón': { calories: 39, protein: 0.9, carbs: 10, fat: 0.3, fiber: 1.5, unitName: 'melocotón', unitWeight: 150 },
  'Piña': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 },
  'Dátil': { calories: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8, unitName: 'dátil', unitWeight: 8 },

  // Grasas, semillas y otros
  'Anacardo': { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 },
  'Avellana': { calories: 628, protein: 15, carbs: 17, fat: 61, fiber: 10 },
  'Pistacho': { calories: 560, protein: 20, carbs: 28, fat: 45, fiber: 10 },
  'Semilla de chía': { calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34 },
  'Semilla de sésamo': { calories: 573, protein: 18, carbs: 23, fat: 50, fiber: 12 },
  'Coco rallado': { calories: 660, protein: 6.9, carbs: 24, fat: 65, fiber: 16 },
  'Tahini': { calories: 595, protein: 17, carbs: 21, fat: 54, fiber: 9 },
  'Chocolate negro 85%': { calories: 592, protein: 10, carbs: 22, fat: 50, fiber: 11 },
  'Cacao en polvo desgrasado': { calories: 228, protein: 20, carbs: 54, fat: 11, fiber: 33 },
  'Miel': { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2 },
  'Salsa de soja': { calories: 53, protein: 8, carbs: 4.9, fat: 0.6, fiber: 0.8 },
  'Curry en polvo': { calories: 325, protein: 14, carbs: 56, fat: 14, fiber: 53 },
  'Comino molido': { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 11 },
  'Tomillo seco': { calories: 276, protein: 9, carbs: 64, fat: 7.4, fiber: 37 },
  'Laurel': { calories: 313, protein: 7.6, carbs: 75, fat: 8.4, fiber: 26 },
  'Perejil fresco': { calories: 36, protein: 3, carbs: 6.3, fat: 0.8, fiber: 3.3 },
  'Albahaca fresca': { calories: 23, protein: 3.2, carbs: 2.7, fat: 0.6, fiber: 1.6 },
  'Caldo de pollo': { calories: 7, protein: 1, carbs: 0.5, fat: 0.2, fiber: 0 },
  'Caldo de verduras': { calories: 6, protein: 0.4, carbs: 0.9, fat: 0.1, fiber: 0 },
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

  // ══ SEGUNDA TANDA · DESAYUNOS ═══════════════════════════════════════════
  {
    name: 'Tostada de pavo y queso',
    description: 'Dos rebanadas y a la calle.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan.', 'Pon las lonchas de pavo y el queso encima.'],
    ingredients: [
      { food: 'Pan de molde integral', quantity: 2, byUnit: true },
      { food: 'Pechuga de pavo en lonchas', quantity: 3, byUnit: true },
      { food: 'Queso curado', quantity: 25 },
    ],
  },
  {
    name: 'Yogur con kiwi y semillas de chía',
    description: 'Se prepara la noche antes y por la mañana está listo.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Mezcla el yogur con la chía y déjalo en la nevera.', 'Por la mañana añade el kiwi troceado.'],
    ingredients: [
      { food: 'Yogur natural', quantity: 200 },
      { food: 'Semilla de chía', quantity: 15 },
      { food: 'Kiwi', quantity: 2, byUnit: true },
    ],
  },
  {
    name: 'Tortilla de champiñones',
    description: 'Dos huevos y un puñado de setas.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Saltea los champiñones laminados con el aceite.', 'Añade los huevos batidos con sal y cuaja la tortilla.'],
    ingredients: [
      { food: 'Huevo', quantity: 3, byUnit: true },
      { food: 'Champiñón', quantity: 120 },
      { food: 'Aceite de oliva virgen extra', quantity: 10 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Avena con cacao y plátano',
    description: 'Sabe a chocolate y no lleva azúcar añadido.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Calienta la avena con la leche 2 minutos en el microondas.', 'Mezcla el cacao y añade el plátano en rodajas.'],
    ingredients: [
      { food: 'Copos de avena', quantity: 50 },
      { food: 'Leche semidesnatada', quantity: 200 },
      { food: 'Cacao en polvo desgrasado', quantity: 10 },
      { food: 'Plátano', quantity: 1, byUnit: true },
    ],
  },
  {
    name: 'Tostada de queso de cabra y miel',
    description: 'Dulce y salado, listo en dos minutos.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Tuesta el pan.', 'Pon el queso de cabra en rodajas y riega con la miel.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Queso de cabra', quantity: 50 },
      { food: 'Miel', quantity: 10 },
    ],
  },
  {
    name: 'Huevos a la plancha con aguacate',
    description: 'Sin pan. Llena mucho y no lleva hidratos.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Haz los huevos a la plancha con el aceite.', 'Sírvelos con el aguacate en láminas y sal.'],
    ingredients: [
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Aguacate', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Batido de fresas y kéfir',
    description: 'Un minuto de batidora.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Bate el kéfir con las fresas y la avena hasta que quede fino.'],
    ingredients: [
      { food: 'Kéfir', quantity: 250 },
      { food: 'Fresa', quantity: 150 },
      { food: 'Copos de avena', quantity: 30 },
    ],
  },
  {
    name: 'Tostada de sardinas y tomate',
    description: 'De lata, y con mucho omega 3.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan y ralla el tomate encima.', 'Coloca las sardinas escurridas y añade una pizca de sal.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Sardina', quantity: 80 },
      { food: 'Tomate', quantity: 80 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Requesón con fresas y almendras',
    description: 'Sin fuego y con mucha proteína.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Pon el requesón en un bol.', 'Añade las fresas troceadas y las almendras.'],
    ingredients: [
      { food: 'Requesón', quantity: 175 },
      { food: 'Fresa', quantity: 120 },
      { food: 'Almendra cruda', quantity: 15 },
    ],
  },
  {
    name: 'Wrap de huevo y pavo',
    description: 'Se come con una mano de camino al trabajo.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora'],
    instructions: ['Haz un revuelto con los huevos y una pizca de sal.', 'Ponlo sobre la tortilla con el pavo y enróllala.'],
    ingredients: [
      { food: 'Tortilla de trigo', quantity: 1, byUnit: true },
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Pechuga de pavo en lonchas', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Porridge de avena con manzana y canela',
    description: 'Como una tarta de manzana, pero de desayuno.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Cuece la avena con la leche y la manzana rallada 3 minutos.', 'Espolvorea la canela.'],
    ingredients: [
      { food: 'Copos de avena', quantity: 50 },
      { food: 'Leche semidesnatada', quantity: 200 },
      { food: 'Manzana', quantity: 1, byUnit: true },
      { food: 'Canela molida', quantity: 1 },
    ],
  },
  {
    name: 'Tostada de aguacate y salmón ahumado',
    description: 'El desayuno de brunch, en casa y en tres minutos.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan y aplasta el aguacate encima.', 'Coloca el salmón y exprime unas gotas de limón.'],
    ingredients: [
      { food: 'Pan de centeno', quantity: 2, byUnit: true },
      { food: 'Aguacate', quantity: 75 },
      { food: 'Salmón ahumado', quantity: 60 },
      { food: 'Limón', quantity: 15 },
    ],
  },
  {
    name: 'Yogur griego con nueces y miel',
    description: 'Tres ingredientes y ni un cacharro que fregar.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Pon el yogur en un bol y añade las nueces y la miel.'],
    ingredients: [
      { food: 'Yogur griego natural', quantity: 200 },
      { food: 'Nuez', quantity: 20 },
      { food: 'Miel', quantity: 12 },
    ],
  },
  {
    name: 'Revuelto de gambas y espárragos',
    description: 'Suena a restaurante y se hace en ocho minutos.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora', 'keto'],
    instructions: ['Saltea los espárragos troceados con el aceite 4 minutos.', 'Añade las gambas 2 minutos y luego los huevos batidos con sal.'],
    ingredients: [
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Gamba pelada', quantity: 100 },
      { food: 'Espárrago verde', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 10 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tostada de crema de cacahuete y plátano',
    description: 'El clásico de antes de entrenar.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Tuesta el pan y unta la crema de cacahuete.', 'Cubre con el plátano en rodajas.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Crema de cacahuete', quantity: 20 },
      { food: 'Plátano', quantity: 1, byUnit: true },
    ],
  },
  {
    name: 'Huevos revueltos con queso azul',
    description: 'Cuatro minutos de sartén y sabor de sobra.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Bate los huevos con sal y cuájalos a fuego suave con la mantequilla.', 'Fuera del fuego, desmenuza el queso azul por encima.'],
    ingredients: [
      { food: 'Huevo', quantity: 3, byUnit: true },
      { food: 'Queso azul', quantity: 30 },
      { food: 'Mantequilla', quantity: 8 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tostada de tomate y aguacate',
    description: 'Sin nada de origen animal y sin cocinar.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Tuesta el pan.', 'Aplasta el aguacate encima, añade el tomate rallado, aceite y sal.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Aguacate', quantity: 80 },
      { food: 'Tomate', quantity: 80 },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Bol de kéfir con frutos rojos y avellanas',
    description: 'Se monta en el bol y ya está.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Pon el kéfir en un bol.', 'Añade los frutos rojos y las avellanas troceadas.'],
    ingredients: [
      { food: 'Kéfir', quantity: 250 },
      { food: 'Frutos rojos congelados', quantity: 100 },
      { food: 'Avellana', quantity: 20 },
    ],
  },
  {
    name: 'Revuelto de tofu con espinacas',
    description: 'El revuelto sin huevo. Sale igual de cremoso.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'vegana', 'keto'],
    instructions: ['Desmenuza el tofu con las manos y saltéalo con el aceite 4 minutos.', 'Añade las espinacas, el comino y la sal, y remueve 2 minutos.'],
    ingredients: [
      { food: 'Tofu firme', quantity: 200 },
      { food: 'Espinaca fresca', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 10 },
      { food: 'Comino molido', quantity: 1 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tostada de jamón cocido y queso',
    description: 'El desayuno de siempre, sin complicaciones.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan.', 'Pon el jamón y el queso encima y dale un golpe de microondas para fundirlo.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Jamón cocido', quantity: 2, byUnit: true },
      { food: 'Mozzarella', quantity: 40 },
    ],
  },
  {
    name: 'Batido verde de espinacas y plátano',
    description: 'Sabe a plátano, no a espinaca. Palabra.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Mete todo en la batidora y bate 40 segundos.'],
    ingredients: [
      { food: 'Leche semidesnatada', quantity: 250 },
      { food: 'Plátano', quantity: 1, byUnit: true },
      { food: 'Espinaca fresca', quantity: 50 },
      { food: 'Crema de cacahuete', quantity: 15 },
    ],
  },
  {
    name: 'Yogur griego con melocotón y pistachos',
    description: 'De verano, fresco y sin cocinar.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Trocea el melocotón.', 'Mézclalo con el yogur y añade los pistachos.'],
    ingredients: [
      { food: 'Yogur griego natural', quantity: 200 },
      { food: 'Melocotón', quantity: 1, byUnit: true },
      { food: 'Pistacho', quantity: 20 },
    ],
  },
  {
    name: 'Huevos duros con aguacate y sésamo',
    description: 'Se cuecen la noche antes y se montan en un minuto.',
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Cuece los huevos 10 minutos y pélalos.', 'Sírvelos con el aguacate, el sésamo y sal.'],
    ingredients: [
      { food: 'Huevo', quantity: 2, byUnit: true },
      { food: 'Aguacate', quantity: 100 },
      { food: 'Semilla de sésamo', quantity: 8 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tortilla de chorizo',
    description: 'Contundente y sin hidratos.',
    servings: 1, category: ['desayuno'], dietTags: ['omnivora', 'keto'],
    instructions: ['Dora el chorizo en dados sin aceite.', 'Añade los huevos batidos con sal y cuaja la tortilla.'],
    ingredients: [
      { food: 'Huevo', quantity: 3, byUnit: true },
      { food: 'Chorizo', quantity: 30 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Bol de avena con dátiles y anacardos',
    description: 'Dulce sin azúcar añadido, para días de mucho gasto.',
    // Lleva leche de vaca: vegetariana sí, vegana no.
    servings: 1, category: ['desayuno'], dietTags: ['vegetariana'],
    instructions: ['Calienta la avena con la leche 2 minutos.', 'Añade los dátiles troceados y los anacardos.'],
    ingredients: [
      { food: 'Copos de avena', quantity: 60 },
      { food: 'Leche semidesnatada', quantity: 220 },
      { food: 'Dátil', quantity: 3, byUnit: true },
      { food: 'Anacardo', quantity: 20 },
    ],
  },

  // ══ SEGUNDA TANDA · ALMUERZOS ═══════════════════════════════════════════
  {
    name: 'Macarrones con carne picada',
    description: 'El plato que gusta a todo el mundo.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Cuece la pasta.', 'Sofríe la cebolla y el ajo, añade la carne y dórala.', 'Echa el tomate, cuece 10 minutos y mezcla con la pasta.'],
    ingredients: [
      { food: 'Pasta seca', quantity: 320 },
      { food: 'Carne picada de ternera', quantity: 400 },
      { food: 'Tomate triturado', quantity: 400 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Garbanzos con espinacas',
    description: 'De cuchara, de bote, y en quince minutos.',
    servings: 4, category: ['almuerzo'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Sofríe el ajo con el aceite y el pimentón.', 'Añade los garbanzos escurridos y las espinacas.', 'Rehoga 8 minutos con un poco de agua y sala.'],
    ingredients: [
      { food: 'Garbanzo cocido', quantity: 600 },
      { food: 'Espinaca fresca', quantity: 300 },
      { food: 'Ajo', quantity: 3, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Pimentón dulce', quantity: 3 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Pollo al curry con arroz',
    description: 'Una sartén, nata y curry. No falla.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Cuece el arroz.', 'Dora el pollo troceado con la cebolla.', 'Añade el curry y la nata y cuece 8 minutos.'],
    ingredients: [
      { food: 'Arroz blanco crudo', quantity: 280 },
      { food: 'Pechuga de pollo', quantity: 600 },
      { food: 'Nata para cocinar', quantity: 200 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Curry en polvo', quantity: 8 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Lentejas con chorizo',
    description: 'Las de la abuela. Mejor de un día para otro.',
    servings: 4, category: ['almuerzo'], dietTags: ['omnivora'],
    instructions: ['Sofríe la cebolla, la zanahoria y el chorizo en rodajas.', 'Añade el pimentón y las lentejas, cubre con agua y el laurel.', 'Cuece 35 minutos a fuego suave.'],
    ingredients: [
      { food: 'Lenteja pardina seca', quantity: 300 },
      { food: 'Chorizo', quantity: 100 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Pimentón dulce', quantity: 3 },
      { food: 'Laurel', quantity: 1 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Bacalao al horno con patata',
    description: 'Bandeja al horno y a otra cosa.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Hornea las patatas en rodajas 20 minutos a 200 ºC.', 'Coloca el bacalao encima con el ajo y el perejil.', 'Riega con aceite y hornea 15 minutos más.'],
    ingredients: [
      { food: 'Bacalao fresco', quantity: 700 },
      { food: 'Patata', quantity: 600 },
      { food: 'Ajo', quantity: 3, byUnit: true },
      { food: 'Perejil fresco', quantity: 10 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Ensalada de quinoa con verduras',
    description: 'Se hace de una vez para varios táperes.',
    servings: 4, category: ['almuerzo'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Cuece la quinoa 15 minutos y escúrrela.', 'Pica el pepino, el tomate y el pimiento.', 'Mézclalo todo y aliña con aceite, limón y sal.'],
    ingredients: [
      { food: 'Quinoa seca', quantity: 250 },
      { food: 'Pepino', quantity: 200 },
      { food: 'Tomate cherry', quantity: 250 },
      { food: 'Pimiento rojo', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Limón', quantity: 40 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Arroz integral con pollo y brócoli',
    description: 'El táper de toda la semana.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Cuece el arroz integral 30 minutos.', 'Saltea el pollo en tiras y el brócoli con el ajo.', 'Mézclalo todo con la salsa de soja.'],
    ingredients: [
      { food: 'Arroz integral crudo', quantity: 280 },
      { food: 'Pechuga de pollo', quantity: 600 },
      { food: 'Brócoli', quantity: 400 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Salsa de soja', quantity: 30 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
    ],
  },
  {
    name: 'Albóndigas de ternera con tomate',
    description: 'Se congelan de maravilla.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Mezcla la carne con el huevo, el ajo y el perejil y forma bolas.', 'Dóralas en la sartén.', 'Añade el tomate triturado y cuece 15 minutos.'],
    ingredients: [
      { food: 'Carne picada de ternera', quantity: 600 },
      { food: 'Huevo', quantity: 1, byUnit: true },
      { food: 'Tomate triturado', quantity: 400 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Perejil fresco', quantity: 10 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Salteado de gambas con arroz',
    description: 'Diez minutos a fuego fuerte, y es plato único.',
    // Lleva arroz, así que ya no es keto: sin él la ración se quedaba en 212
    // kcal, muy poco para una comida principal.
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Cuece el arroz.', 'Saltea el calabacín y el pimiento 5 minutos.', 'Añade las gambas y el ajo 3 minutos, y mezcla con el arroz y la soja.'],
    ingredients: [
      { food: 'Arroz blanco crudo', quantity: 260 },
      { food: 'Gamba pelada', quantity: 600 },
      { food: 'Calabacín', quantity: 300 },
      { food: 'Pimiento verde', quantity: 200 },
      { food: 'Ajo', quantity: 3, byUnit: true },
      { food: 'Salsa de soja', quantity: 25 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
    ],
  },
  {
    name: 'Alubias blancas con verduras',
    description: 'De bote, listas en veinte minutos.',
    servings: 4, category: ['almuerzo'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Sofríe el puerro, la zanahoria y el pimiento.', 'Añade las alubias y el caldo y cuece 15 minutos.', 'Sala al final.'],
    ingredients: [
      { food: 'Alubia blanca cocida', quantity: 700 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Pimiento verde', quantity: 100 },
      { food: 'Caldo de verduras', quantity: 300 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Lomo de cerdo con pimientos',
    description: 'Plancha y listo. Sin hidratos.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Haz el lomo a la plancha 4 minutos por cada lado.', 'Asa los pimientos en tiras con el ajo.', 'Sirve la carne con los pimientos por encima.'],
    ingredients: [
      { food: 'Lomo de cerdo', quantity: 700 },
      { food: 'Pimiento rojo', quantity: 300 },
      { food: 'Pimiento verde', quantity: 200 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Pasta con calabacín y parmesano',
    description: 'Cuatro ingredientes y sale cremosa sin nata.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece la pasta y reserva un vaso del agua.', 'Saltea el calabacín rallado con el ajo.', 'Mezcla con la pasta, el parmesano y un poco del agua de cocción.'],
    ingredients: [
      { food: 'Pasta seca', quantity: 320 },
      { food: 'Calabacín', quantity: 500 },
      { food: 'Parmesano', quantity: 80 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Pollo asado con boniato',
    description: 'Todo a la bandeja y cuarenta minutos de horno.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Corta el boniato en dados y ponlo en la bandeja.', 'Coloca el pollo encima con el tomillo, el aceite y la sal.', 'Hornea 40 minutos a 200 ºC.'],
    ingredients: [
      { food: 'Muslo de pollo', quantity: 700 },
      { food: 'Boniato', quantity: 600 },
      { food: 'Tomillo seco', quantity: 3 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Tortilla de calabacín',
    description: 'Como la de patatas pero más ligera.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['vegetariana'],
    instructions: ['Pocha el calabacín en rodajas con la cebolla 15 minutos.', 'Mezcla con los huevos batidos y la sal.', 'Cuaja 3 minutos por cada lado.'],
    ingredients: [
      { food: 'Calabacín', quantity: 700 },
      // 2 huevos por ración y un poco de queso: con 6 huevos se quedaba en 251
      // kcal, más de merienda que de comida.
      { food: 'Huevo', quantity: 8, byUnit: true },
      { food: 'Queso rallado', quantity: 80 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 35 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Guiso de pavo con verduras',
    description: 'Una cazuela, poca grasa y mucha proteína.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Dora el pavo en dados.', 'Añade la zanahoria, el puerro y la judía verde.', 'Cubre con caldo y cuece 25 minutos.'],
    ingredients: [
      { food: 'Pechuga de pavo', quantity: 700 },
      { food: 'Zanahoria', quantity: 200 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Judía verde', quantity: 250 },
      { food: 'Caldo de pollo', quantity: 400 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Ensalada de pasta con atún y maíz',
    description: 'Fría, para llevar, y aguanta dos días.',
    servings: 4, category: ['almuerzo'], dietTags: ['omnivora'],
    instructions: ['Cuece la pasta y enfríala bajo el grifo.', 'Mézclala con el atún, el maíz y el tomate.', 'Aliña con aceite, vinagre y sal.'],
    ingredients: [
      { food: 'Pasta seca', quantity: 280 },
      { food: 'Atún al natural', quantity: 240 },
      { food: 'Maíz dulce', quantity: 200 },
      { food: 'Tomate cherry', quantity: 200 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Vinagre de vino', quantity: 10 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Berenjenas rellenas de carne',
    description: 'Parece de restaurante y es de horno.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Hornea las berenjenas partidas 20 minutos y vacíalas.', 'Sofríe la carne con la cebolla y la pulpa de la berenjena.', 'Rellena, cubre con queso y gratina 10 minutos.'],
    ingredients: [
      { food: 'Berenjena', quantity: 700 },
      { food: 'Carne picada de ternera', quantity: 400 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Tomate triturado', quantity: 200 },
      { food: 'Mozzarella', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Cuscús con verduras y garbanzos',
    description: 'El cuscús solo necesita agua caliente. Cinco minutos.',
    servings: 4, category: ['almuerzo'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Cubre el cuscús con el mismo volumen de agua hirviendo y tapa 5 minutos.', 'Saltea el calabacín, el pimiento y la cebolla con el comino.', 'Mezcla todo con los garbanzos.'],
    ingredients: [
      { food: 'Cuscús seco', quantity: 250 },
      { food: 'Garbanzo cocido', quantity: 400 },
      { food: 'Calabacín', quantity: 200 },
      { food: 'Pimiento rojo', quantity: 150 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Comino molido', quantity: 3 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Dorada al horno con verduras',
    description: 'Pescado entero al horno, imposible de fastidiar.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Pon la patata y la cebolla en rodajas de base y hornea 20 minutos.', 'Coloca la dorada encima con el limón y el aceite.', 'Hornea 20 minutos más a 190 ºC.'],
    ingredients: [
      { food: 'Dorada', quantity: 800 },
      { food: 'Patata', quantity: 500 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Limón', quantity: 80 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 5 },
    ],
  },
  {
    name: 'Salteado de tofu con brócoli',
    description: 'Wok rápido, sin nada de origen animal.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Dora el tofu en dados hasta que quede crujiente.', 'Añade el brócoli y el ajo y saltea 6 minutos.', 'Termina con la salsa de soja y el sésamo.'],
    ingredients: [
      { food: 'Tofu firme', quantity: 600 },
      { food: 'Brócoli', quantity: 500 },
      { food: 'Ajo', quantity: 3, byUnit: true },
      { food: 'Salsa de soja', quantity: 35 },
      { food: 'Semilla de sésamo', quantity: 15 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
    ],
  },
  {
    name: 'Arroz con verduras y huevo',
    description: 'Vacía la nevera y sale un plato completo.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece el arroz.', 'Saltea el guisante, la zanahoria y el pimiento.', 'Añade el arroz y los huevos batidos, removiendo hasta que cuajen.'],
    ingredients: [
      { food: 'Arroz blanco crudo', quantity: 280 },
      { food: 'Huevo', quantity: 4, byUnit: true },
      { food: 'Guisante', quantity: 200 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Pimiento rojo', quantity: 150 },
      { food: 'Salsa de soja', quantity: 25 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
    ],
  },
  {
    name: 'Hamburguesa de ternera con ensalada',
    description: 'Sin pan, para no salirse de keto.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Forma las hamburguesas con la carne y la sal.', 'Hazlas a la plancha 4 minutos por cada lado.', 'Sirve con la ensalada aliñada.'],
    ingredients: [
      { food: 'Carne picada de ternera', quantity: 600 },
      { food: 'Lechuga', quantity: 200 },
      { food: 'Tomate', quantity: 200 },
      { food: 'Queso curado', quantity: 80 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Crema de calabaza',
    description: 'Se cuece todo junto y se tritura. No tiene más.',
    // Solo cena: una crema no da para comida principal sin inflarla a base de
    // nata, y de cena encaja bien con la ración de calorías que le toca.
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece la calabaza, la patata, el puerro y la zanahoria 25 minutos.', 'Tritura con el aceite y la sal hasta que quede fina.'],
    ingredients: [
      { food: 'Calabaza', quantity: 800 },
      { food: 'Patata', quantity: 250 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Nata para cocinar', quantity: 180 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Mejillones al vapor con limón',
    description: 'Cinco minutos de cazuela tapada.',
    // Sin 'keto': 300 g de mejillón por ración se van a 14 g de hidratos.
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora'],
    instructions: ['Limpia los mejillones.', 'Ponlos en una cazuela con el limón y el laurel, tapa y cuece 6 minutos.', 'Riega con aceite y perejil al servir.'],
    ingredients: [
      { food: 'Mejillón', quantity: 1200 },
      { food: 'Limón', quantity: 100 },
      { food: 'Laurel', quantity: 1 },
      { food: 'Perejil fresco', quantity: 10 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
    ],
  },
  {
    name: 'Coliflor asada con jamón y queso',
    description: 'La coliflor al horno no sabe a coliflor hervida.',
    servings: 4, category: ['almuerzo', 'cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Trocea la coliflor, aliña con aceite y sal y hornea 30 minutos a 200 ºC.', 'Añade el jamón y el queso y gratina 8 minutos.'],
    ingredients: [
      { food: 'Coliflor', quantity: 900 },
      { food: 'Jamón serrano', quantity: 6, byUnit: true },
      { food: 'Mozzarella', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 35 },
      { food: 'Sal', quantity: 4 },
    ],
  },

  // ══ SEGUNDA TANDA · CENAS ═══════════════════════════════════════════════
  // Más ligeras que los almuerzos a propósito: el objetivo diario reparte
  // menos calorías a la cena (0,30 frente a 0,35), y una cena de 700 kcal
  // obliga al autocompletado a dejar el hueco vacío por no encajar.
  {
    name: 'Crema de calabacín',
    description: 'Se cuece y se tritura. Cena de diez minutos.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece el calabacín, la patata y el puerro 20 minutos.', 'Tritura con el queso, el aceite y la sal.'],
    ingredients: [
      { food: 'Calabacín', quantity: 800 },
      // Más patata y más queso: a 190 kcal por ración era un entrante, no una
      // cena, y el plan tendría que poner tres raciones para cuadrar.
      { food: 'Patata', quantity: 400 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Queso crema', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Merluza a la plancha con ensalada',
    description: 'Lo más ligero que hay para acabar el día.',
    servings: 4, category: ['cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Haz la merluza a la plancha 3 minutos por cada lado.', 'Aliña la ensalada con aceite, limón y sal.'],
    ingredients: [
      // 225 g de merluza por ración: es pescado muy magro y con menos se
      // quedaba en 242 kcal.
      { food: 'Merluza', quantity: 900 },
      { food: 'Lechuga', quantity: 200 },
      { food: 'Tomate cherry', quantity: 200 },
      { food: 'Aguacate', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Limón', quantity: 40 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Revuelto de setas y gambas',
    description: 'Cena de sartén en ocho minutos.',
    servings: 4, category: ['cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Saltea los champiñones con el ajo.', 'Añade las gambas 2 minutos.', 'Echa los huevos batidos y remueve hasta que cuajen.'],
    ingredients: [
      { food: 'Huevo', quantity: 6, byUnit: true },
      { food: 'Gamba pelada', quantity: 300 },
      { food: 'Champiñón', quantity: 400 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Ensalada de tomate, mozzarella y albahaca',
    description: 'Sin cocinar nada. Cena de verano.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Corta el tomate y la mozzarella en rodajas.', 'Alterna en el plato con la albahaca y aliña con aceite y sal.'],
    ingredients: [
      { food: 'Tomate', quantity: 600 },
      { food: 'Mozzarella', quantity: 300 },
      { food: 'Albahaca fresca', quantity: 15 },
      { food: 'Aceite de oliva virgen extra', quantity: 40 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Pechuga de pollo con calabacín a la plancha',
    description: 'Dos ingredientes y una sartén.',
    servings: 4, category: ['cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Haz el pollo a la plancha 5 minutos por cada lado.', 'Plancha el calabacín en rodajas con un poco de aceite y sal.'],
    ingredients: [
      { food: 'Pechuga de pollo', quantity: 600 },
      { food: 'Calabacín', quantity: 500 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Sopa de verduras con fideos',
    description: 'Reconforta y se hace sola en la olla.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece la zanahoria, el puerro y la judía verde en el caldo 20 minutos.', 'Añade la pasta y cuece 8 minutos más.'],
    ingredients: [
      { food: 'Caldo de verduras', quantity: 1200 },
      // Más fideos y un huevo duro por cabeza: una sopa de 228 kcal no aguanta
      // como cena y deja con hambre a las dos horas.
      { food: 'Pasta seca', quantity: 200 },
      { food: 'Huevo', quantity: 4, byUnit: true },
      { food: 'Zanahoria', quantity: 200 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Judía verde', quantity: 200 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Tortilla de espinacas y queso',
    description: 'Cena rápida con lo que hay en la nevera.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Saltea las espinacas con el ajo.', 'Mezcla con los huevos batidos, el queso y la sal.', 'Cuaja 3 minutos por cada lado.'],
    ingredients: [
      { food: 'Huevo', quantity: 8, byUnit: true },
      { food: 'Espinaca fresca', quantity: 300 },
      { food: 'Queso rallado', quantity: 80 },
      { food: 'Ajo', quantity: 2, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Salmón al horno con espárragos y limón',
    description: 'Papel de horno, quince minutos y a la mesa.',
    servings: 4, category: ['cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Pon el salmón y los espárragos en la bandeja.', 'Riega con aceite y limón, sala y hornea 15 minutos a 200 ºC.'],
    ingredients: [
      { food: 'Salmón fresco', quantity: 550 },
      { food: 'Espárrago verde', quantity: 400 },
      { food: 'Limón', quantity: 60 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Ensalada de canónigos, pavo y nueces',
    description: 'Cena fría sin encender nada.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Mezcla los canónigos con el pavo en tiras y las nueces.', 'Aliña con aceite, vinagre y sal.'],
    ingredients: [
      { food: 'Canónigos', quantity: 200 },
      { food: 'Pechuga de pavo en lonchas', quantity: 12, byUnit: true },
      { food: 'Nuez', quantity: 60 },
      { food: 'Tomate cherry', quantity: 200 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Vinagre de vino', quantity: 15 },
    ],
  },
  {
    name: 'Puré de patata con huevo poché',
    description: 'Cena de las de manta y sofá.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Cuece las patatas 20 minutos y aplástalas con la leche y la mantequilla.', 'Escalfa los huevos 3 minutos en agua hirviendo con un chorro de vinagre.'],
    ingredients: [
      { food: 'Patata', quantity: 700 },
      { food: 'Huevo', quantity: 4, byUnit: true },
      { food: 'Leche semidesnatada', quantity: 150 },
      { food: 'Mantequilla', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Berenjena a la plancha con queso feta',
    description: 'Se hace en la plancha y se monta en el plato.',
    // Sin 'keto': 200 g de berenjena por ración pasan de 12 g de hidratos.
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Plancha la berenjena en rodajas 3 minutos por cada lado.', 'Desmenuza el feta por encima con el orégano y el aceite.'],
    ingredients: [
      { food: 'Berenjena', quantity: 800 },
      { food: 'Queso feta', quantity: 200 },
      { food: 'Orégano seco', quantity: 2 },
      { food: 'Aceite de oliva virgen extra', quantity: 35 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Wok de pollo con verduras y soja',
    description: 'Todo en la misma sartén, doce minutos.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Sella el pollo en tiras a fuego fuerte.', 'Añade el pimiento, la zanahoria y la col y saltea 6 minutos.', 'Termina con la salsa de soja y el sésamo.'],
    ingredients: [
      { food: 'Pechuga de pollo', quantity: 550 },
      { food: 'Pimiento rojo', quantity: 200 },
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Col lombarda', quantity: 200 },
      { food: 'Salsa de soja', quantity: 30 },
      { food: 'Semilla de sésamo', quantity: 15 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
    ],
  },
  {
    name: 'Crema de champiñones',
    description: 'Cremosa sin nata, solo triturando bien.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Pocha el puerro y añade los champiñones laminados.', 'Cubre con caldo y cuece 15 minutos.', 'Tritura con el queso crema y sala.'],
    ingredients: [
      { food: 'Champiñón', quantity: 700 },
      { food: 'Puerro', quantity: 200 },
      // Más patata y más queso: el champiñón casi no aporta calorías y la
      // ración se quedaba en 213.
      { food: 'Patata', quantity: 400 },
      { food: 'Caldo de verduras', quantity: 700 },
      { food: 'Queso crema', quantity: 150 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Tortilla de atún y cebolla',
    description: 'Una lata, dos huevos por persona y listo.',
    servings: 4, category: ['cena'], dietTags: ['omnivora', 'keto'],
    instructions: ['Pocha la cebolla 10 minutos.', 'Mezcla con el atún escurrido y los huevos batidos.', 'Cuaja la tortilla 3 minutos por cada lado.'],
    ingredients: [
      { food: 'Huevo', quantity: 8, byUnit: true },
      { food: 'Atún al natural', quantity: 240 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Ensalada de garbanzos, pepino y feta',
    description: 'De bote y sin fuego, en cinco minutos.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Escurre los garbanzos.', 'Pica el pepino y el tomate y mézclalo todo con el feta.', 'Aliña con aceite, limón y orégano.'],
    ingredients: [
      { food: 'Garbanzo cocido', quantity: 450 },
      { food: 'Pepino', quantity: 250 },
      { food: 'Tomate cherry', quantity: 200 },
      { food: 'Queso feta', quantity: 120 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Limón', quantity: 30 },
      { food: 'Orégano seco', quantity: 2 },
    ],
  },
  {
    name: 'Lomo de cerdo con manzana',
    description: 'El dulce de la manzana va sorprendentemente bien.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Haz el lomo a la plancha y resérvalo.', 'En la misma sartén, saltea la manzana en gajos con la cebolla 8 minutos.', 'Sirve la carne con la manzana por encima.'],
    ingredients: [
      { food: 'Lomo de cerdo', quantity: 600 },
      { food: 'Manzana', quantity: 2, byUnit: true },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Revuelto de calabacín y queso de cabra',
    description: 'Cena de sartén con sabor de restaurante.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Saltea el calabacín rallado 6 minutos.', 'Añade los huevos batidos y remueve.', 'Fuera del fuego, desmenuza el queso de cabra.'],
    ingredients: [
      { food: 'Huevo', quantity: 8, byUnit: true },
      { food: 'Calabacín', quantity: 400 },
      { food: 'Queso de cabra', quantity: 120 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Sopa de pollo con arroz',
    description: 'Cena de olla, y las sobras valen para mañana.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Cuece el pollo en el caldo con la zanahoria y el puerro 25 minutos.', 'Desmenuza el pollo, añade el arroz y cuece 15 minutos más.'],
    ingredients: [
      { food: 'Pechuga de pollo', quantity: 400 },
      { food: 'Caldo de pollo', quantity: 1200 },
      { food: 'Arroz blanco crudo', quantity: 120 },
      { food: 'Zanahoria', quantity: 200 },
      { food: 'Puerro', quantity: 150 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Brócoli salteado con ajo y almendras',
    description: 'Guarnición que vale de cena entera.',
    // Sin 'keto': con 200 g de brócoli y almendras se va a 20 g de hidratos.
    servings: 4, category: ['cena'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Cuece el brócoli 5 minutos y escúrrelo.', 'Saltéalo con el ajo laminado y las almendras 4 minutos.'],
    ingredients: [
      { food: 'Brócoli', quantity: 800 },
      { food: 'Almendra cruda', quantity: 80 },
      { food: 'Ajo', quantity: 4, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 35 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Tostas de pan con tomate y anchoas',
    description: 'Cena de picar, sin cocinar.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan y ralla el tomate encima.', 'Coloca las anchoas y riega con un poco de aceite.'],
    ingredients: [
      { food: 'Pan integral', quantity: 8, byUnit: true },
      { food: 'Anchoa en aceite', quantity: 100 },
      { food: 'Tomate', quantity: 300 },
      { food: 'Aceite de oliva virgen extra', quantity: 20 },
    ],
  },
  {
    name: 'Calabacín relleno de pavo',
    description: 'Se vacía, se rellena y al horno.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Parte los calabacines, vacíalos y hornéalos 15 minutos.', 'Sofríe el pavo picado con la cebolla y la pulpa.', 'Rellena, cubre con queso y gratina 10 minutos.'],
    ingredients: [
      { food: 'Calabacín', quantity: 800 },
      { food: 'Pechuga de pavo', quantity: 400 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Mozzarella', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 25 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Ensalada de rúcula, pera y queso azul',
    description: 'Tres sabores que se llevan muy bien.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana'],
    instructions: ['Pon la rúcula de base.', 'Añade la pera en láminas, el queso azul y las nueces.', 'Aliña con aceite y vinagre.'],
    ingredients: [
      { food: 'Rúcula', quantity: 200 },
      { food: 'Pera', quantity: 2, byUnit: true },
      { food: 'Queso azul', quantity: 120 },
      { food: 'Nuez', quantity: 60 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Vinagre de vino', quantity: 15 },
    ],
  },
  {
    name: 'Judías verdes con patata y jamón',
    description: 'De congelador a plato en quince minutos.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Cuece la patata en dados y las judías verdes 12 minutos.', 'Escúrrelas y saltéalas con el ajo y el jamón en tiras 4 minutos.'],
    ingredients: [
      { food: 'Judía verde', quantity: 800 },
      // La patata la convierte en cena de verdad: sin ella eran 204 kcal.
      { food: 'Patata', quantity: 450 },
      { food: 'Jamón serrano', quantity: 6, byUnit: true },
      { food: 'Ajo', quantity: 3, byUnit: true },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 3 },
    ],
  },
  {
    name: 'Bacalao con pisto',
    description: 'El pisto se hace de una vez y aguanta toda la semana.',
    servings: 4, category: ['cena'], dietTags: ['omnivora'],
    instructions: ['Sofríe el calabacín, la berenjena, el pimiento y la cebolla 20 minutos.', 'Añade el tomate triturado y cuece 10 minutos.', 'Coloca el bacalao encima, tapa y cuece 8 minutos.'],
    ingredients: [
      { food: 'Bacalao fresco', quantity: 600 },
      { food: 'Calabacín', quantity: 250 },
      { food: 'Berenjena', quantity: 250 },
      { food: 'Pimiento rojo', quantity: 150 },
      { food: 'Cebolla', quantity: 1, byUnit: true },
      { food: 'Tomate triturado', quantity: 250 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Sal', quantity: 4 },
    ],
  },
  {
    name: 'Ensalada templada de lentejas',
    description: 'Las lentejas de bote también valen para cenar.',
    servings: 4, category: ['cena'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Saltea la cebolla morada y el pimiento 6 minutos.', 'Añade las lentejas cocidas y calienta 3 minutos.', 'Sirve con el tomate y aliña con aceite y vinagre.'],
    ingredients: [
      // 55 g de lenteja seca por ración: con 40 g se quedaba en 233 kcal.
      { food: 'Lenteja pardina seca', quantity: 220 },
      { food: 'Cebolla morada', quantity: 150 },
      { food: 'Pimiento verde', quantity: 150 },
      { food: 'Tomate cherry', quantity: 200 },
      { food: 'Aceite de oliva virgen extra', quantity: 30 },
      { food: 'Vinagre de vino', quantity: 15 },
      { food: 'Sal', quantity: 3 },
    ],
  },

  // ══ SEGUNDA TANDA · MERIENDAS Y SNACKS ══════════════════════════════════
  {
    name: 'Tostada de aguacate y sésamo',
    description: 'Merienda que llena de verdad.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Tuesta el pan y aplasta el aguacate encima.', 'Espolvorea el sésamo y la sal.'],
    ingredients: [
      { food: 'Pan integral', quantity: 1, byUnit: true },
      { food: 'Aguacate', quantity: 70 },
      { food: 'Semilla de sésamo', quantity: 5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Kéfir con arándanos',
    description: 'Se sirve y ya está.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Pon el kéfir en un vaso y añade los frutos rojos.'],
    ingredients: [
      { food: 'Kéfir', quantity: 200 },
      { food: 'Frutos rojos congelados', quantity: 100 },
    ],
  },
  {
    name: 'Puñado de pistachos',
    description: 'Lo más fácil de llevar en el bolso.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana', 'keto'],
    instructions: ['Pesa la ración: es fácil pasarse con los frutos secos.'],
    ingredients: [{ food: 'Pistacho', quantity: 35 }],
  },
  {
    name: 'Naranja y un puñado de almendras',
    description: 'Fruta y grasa buena, sin preparar nada.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Pela la naranja y acompáñala con las almendras.'],
    ingredients: [
      { food: 'Naranja', quantity: 1, byUnit: true },
      { food: 'Almendra cruda', quantity: 25 },
    ],
  },
  {
    name: 'Tortitas de arroz con crema de cacahuete',
    description: 'Crujiente y en veinte segundos.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Unta la crema de cacahuete sobre las tortitas.'],
    ingredients: [
      { food: 'Tortita de arroz', quantity: 3, byUnit: true },
      { food: 'Crema de cacahuete', quantity: 20 },
    ],
  },
  {
    name: 'Yogur griego con cacao y nueces',
    description: 'Sabe a postre y no lleva azúcar.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Mezcla el yogur con el cacao hasta que quede uniforme.', 'Añade las nueces troceadas.'],
    ingredients: [
      { food: 'Yogur griego natural', quantity: 175 },
      { food: 'Cacao en polvo desgrasado', quantity: 8 },
      { food: 'Nuez', quantity: 20 },
    ],
  },
  {
    name: 'Tomate cherry con mozzarella',
    description: 'Se pincha y se come. Cero preparación.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Parte los tomates y la mozzarella y aliña con aceite, orégano y sal.'],
    ingredients: [
      { food: 'Tomate cherry', quantity: 150 },
      { food: 'Mozzarella', quantity: 80 },
      { food: 'Aceite de oliva virgen extra', quantity: 5 },
      { food: 'Orégano seco', quantity: 0.5 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Pera con queso curado',
    description: 'La combinación de siempre.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Corta la pera en gajos y el queso en tacos.'],
    ingredients: [
      { food: 'Pera', quantity: 1, byUnit: true },
      { food: 'Queso curado', quantity: 35 },
    ],
  },
  {
    name: 'Batido de proteína con plátano',
    description: 'Después de entrenar, con hidratos para recuperar.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['omnivora'],
    instructions: ['Bate la leche con la proteína y el plátano.'],
    ingredients: [
      { food: 'Leche semidesnatada', quantity: 250 },
      { food: 'Proteína en polvo', quantity: 30 },
      { food: 'Plátano', quantity: 1, byUnit: true },
    ],
  },
  {
    name: 'Edamame con sal',
    description: 'Se hierve cinco minutos y se pican las vainas.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Hierve el edamame 5 minutos.', 'Escurre y sala.'],
    ingredients: [
      { food: 'Edamame', quantity: 150 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Tosta de requesón y tomate',
    description: 'Salada, con proteína y poca grasa.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Tuesta el pan.', 'Unta el requesón y pon el tomate en rodajas con sal.'],
    ingredients: [
      { food: 'Pan integral', quantity: 1, byUnit: true },
      { food: 'Requesón', quantity: 80 },
      { food: 'Tomate', quantity: 80 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Chocolate negro con avellanas',
    description: 'El capricho que sí cabe en el plan.',
    servings: 1, category: ['merienda', 'snack', 'postre'], dietTags: ['vegetariana'],
    instructions: ['Pesa la onza de chocolate y acompáñala con las avellanas.'],
    ingredients: [
      { food: 'Chocolate negro 85%', quantity: 20 },
      { food: 'Avellana', quantity: 20 },
    ],
  },
  {
    name: 'Palitos de pepino con hummus',
    description: 'Para picar viendo la tele.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Corta el pepino en bastones y sírvelo con el hummus.'],
    ingredients: [
      { food: 'Pepino', quantity: 200 },
      { food: 'Hummus', quantity: 60 },
    ],
  },
  {
    name: 'Huevo duro con aguacate',
    description: 'Cero hidratos y llena bastante.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Cuece el huevo 10 minutos y pélalo.', 'Sírvelo con el aguacate y sal.'],
    ingredients: [
      { food: 'Huevo', quantity: 1, byUnit: true },
      { food: 'Aguacate', quantity: 80 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Kiwi con yogur natural',
    description: 'Ligero y con fibra.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Trocea los kiwis sobre el yogur.'],
    ingredients: [
      { food: 'Yogur natural', quantity: 150 },
      { food: 'Kiwi', quantity: 2, byUnit: true },
    ],
  },
  {
    name: 'Rollitos de jamón cocido con queso crema',
    description: 'Sin cocinar y sin hidratos.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['omnivora', 'keto'],
    instructions: ['Unta el queso crema sobre las lonchas y enróllalas.'],
    ingredients: [
      { food: 'Jamón cocido', quantity: 4, byUnit: true },
      { food: 'Queso crema', quantity: 40 },
    ],
  },
  {
    name: 'Piña con coco rallado',
    description: 'Fresco, dulce y sin azúcar añadido.',
    servings: 1, category: ['merienda', 'snack', 'postre'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Trocea la piña y espolvorea el coco.'],
    ingredients: [
      { food: 'Piña', quantity: 200 },
      { food: 'Coco rallado', quantity: 15 },
    ],
  },
  {
    name: 'Tostada de tomate y aceite',
    description: 'La merienda más barata que existe.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Tuesta el pan, ralla el tomate encima y riega con aceite y sal.'],
    ingredients: [
      { food: 'Pan integral', quantity: 2, byUnit: true },
      { food: 'Tomate', quantity: 100 },
      { food: 'Aceite de oliva virgen extra', quantity: 10 },
      { food: 'Sal', quantity: 1 },
    ],
  },
  {
    name: 'Requesón con dátiles',
    description: 'Dulce sin azúcar y con mucha proteína.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana'],
    instructions: ['Trocea los dátiles y mézclalos con el requesón.'],
    ingredients: [
      { food: 'Requesón', quantity: 150 },
      { food: 'Dátil', quantity: 3, byUnit: true },
    ],
  },
  {
    name: 'Aceitunas y queso curado',
    description: 'El aperitivo de bar, en versión ración.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'keto'],
    instructions: ['Sirve las aceitunas con el queso en tacos.'],
    ingredients: [
      { food: 'Aceituna verde', quantity: 60 },
      { food: 'Queso curado', quantity: 40 },
    ],
  },
  {
    name: 'Manzana con canela al microondas',
    description: 'Sabe a postre de horno en dos minutos.',
    servings: 1, category: ['merienda', 'snack', 'postre'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Corta la manzana en dados, espolvorea la canela.', 'Microondas 2 minutos tapada.'],
    ingredients: [
      { food: 'Manzana', quantity: 1, byUnit: true },
      { food: 'Canela molida', quantity: 1 },
      { food: 'Nuez', quantity: 15 },
    ],
  },
  {
    name: 'Latita de mejillones en escabeche',
    description: 'Se abre y se come. Mucha proteína por muy poco.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['omnivora', 'keto'],
    instructions: ['Abre la lata y sírvela con unas gotas de limón.'],
    ingredients: [
      { food: 'Mejillón', quantity: 120 },
      { food: 'Limón', quantity: 15 },
    ],
  },
  {
    name: 'Bol de fresas con yogur griego',
    description: 'De temporada, fresco y sin azúcar.',
    servings: 1, category: ['merienda', 'snack', 'postre'], dietTags: ['vegetariana'],
    instructions: ['Trocea las fresas y mézclalas con el yogur.'],
    ingredients: [
      { food: 'Yogur griego natural', quantity: 150 },
      { food: 'Fresa', quantity: 150 },
    ],
  },
  {
    name: 'Zanahoria con tahini',
    description: 'El tahini cunde mucho: con una cucharada sobra.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['vegetariana', 'vegana'],
    instructions: ['Corta la zanahoria en bastones.', 'Mezcla el tahini con unas gotas de limón para mojar.'],
    ingredients: [
      { food: 'Zanahoria', quantity: 150 },
      { food: 'Tahini', quantity: 20 },
      { food: 'Limón', quantity: 10 },
    ],
  },
  {
    name: 'Tosta de anchoas y queso crema',
    description: 'Salado y con carácter, sin cocinar.',
    servings: 1, category: ['merienda', 'snack'], dietTags: ['omnivora'],
    instructions: ['Tuesta el pan y unta el queso crema.', 'Coloca las anchoas por encima.'],
    ingredients: [
      { food: 'Pan integral', quantity: 1, byUnit: true },
      { food: 'Queso crema', quantity: 25 },
      { food: 'Anchoa en aceite', quantity: 25 },
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

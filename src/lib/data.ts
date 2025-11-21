'use client';
import type { Recipe, WeekPlan, Meal, DayPlan, Ingredient, BaseIngredient } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (hint: string) => PlaceHolderImages.find(img => img.imageHint.includes(hint));

// Helper to create ingredients with their macro data for the initial migration.
// This data is intentionally "dirty" (not normalized to 100g) to simulate the
// real-world scenario that the migration script is designed to fix.
const createInitialIngredient = (
    name: string,
    quantity: number,
    unit: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
): Ingredient => ({
    id: `ing-${name.toLowerCase().replace(/ /g, '-')}-${Math.random()}`,
    name,
    quantity,
    unit,
    calories,
    protein,
    carbs,
    fat,
});


// NOTE: The macros within each ingredient are for migration only.
// The recipe's top-level macros are the pre-calculated totals.
export const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Ensalada Griega',
    description: 'Una ensalada fresca y saludable con queso feta y aceitunas.',
    instructions: '1. Corta los vegetales. 2. Mezcla todos los ingredientes. 3. Aliña con aceite de oliva y orégano.',
    calories: 350,
    protein: 12,
    carbs: 15,
    fat: 25,
    ingredients: [
      createInitialIngredient('Lechuga', 100, 'g', 15, 1, 3, 0.2),
      createInitialIngredient('Tomate', 150, 'g', 27, 1.3, 5.8, 0.3),
      createInitialIngredient('Queso Feta', 50, 'g', 132, 7, 2, 11),
    ],
    imageUrl: findImage('greek salad')?.imageUrl,
    imageHint: findImage('greek salad')?.imageHint,
  },
  {
    id: '2',
    name: 'Pechuga de Pollo a la Plancha',
    description: 'Una opción de proteína magra, rápida y deliciosa.',
    instructions: '1. Sazona la pechuga de pollo. 2. Cocina a la plancha 5-7 minutos por cada lado. 3. Sirve inmediatamente.',
    calories: 280,
    protein: 50,
    carbs: 0,
    fat: 8,
    ingredients: [
      createInitialIngredient('Pechuga de Pollo', 200, 'g', 260, 50, 0, 6),
      createInitialIngredient('Aceite de Oliva', 5, 'ml', 40, 0, 0, 4.5),
    ],
    imageUrl: findImage('grilled chicken')?.imageUrl,
    imageHint: findImage('grilled chicken')?.imageHint,
  },
  {
    id: '3',
    name: 'Avena con Frutos Rojos',
    description: 'Un desayuno energético y rico en fibra.',
    instructions: '1. Cocina la avena con leche o agua. 2. Añade los frutos rojos y un poco de miel al gusto. 3. Sirve caliente.',
    calories: 450,
    protein: 15,
    carbs: 75,
    fat: 10,
    ingredients: [
       createInitialIngredient('Avena', 80, 'g', 310, 13, 55, 6),
       createInitialIngredient('Frutos Rojos', 150, 'g', 85, 1.5, 20, 0.5),
       createInitialIngredient('Leche', 200, 'ml', 94, 6.8, 9.6, 2.2),
    ],
    imageUrl: findImage('oatmeal berries')?.imageUrl,
    imageHint: findImage('oatmeal berries')?.imageHint,
  },
  {
    id: '4',
    name: 'Salmón al Horno con Espárragos',
    description: 'Cena ligera y nutritiva, rica en Omega-3.',
    instructions: '1. Precalienta el horno a 200°C. 2. Coloca el salmón y los espárragos en una bandeja. 3. Sazona con sal, pimienta y limón. 4. Hornea por 12-15 minutos.',
    calories: 550,
    protein: 40,
    carbs: 10,
    fat: 38,
    ingredients: [
      createInitialIngredient('Salmón', 180, 'g', 370, 36, 0, 25),
      createInitialIngredient('Espárragos', 150, 'g', 30, 3.3, 5.8, 0.2),
      createInitialIngredient('Limón', 30, 'g', 9, 0.3, 2.8, 0.1),
    ],
    imageUrl: findImage('baked salmon')?.imageUrl,
    imageHint: findImage('baked salmon')?.imageHint,
  },
  {
    id: '5',
    name: 'Lentejas Estofadas',
    description: 'Un plato de cuchara clásico, reconfortante y lleno de nutrientes.',
    instructions: '1. Sofríe verduras (cebolla, zanahoria, pimiento). 2. Añade las lentejas, chorizo y cubre con agua. 3. Cocina a fuego lento por 45 minutos.',
    calories: 600,
    protein: 30,
    carbs: 80,
    fat: 15,
    ingredients: [
      createInitialIngredient('Lentejas', 100, 'g', 352, 26, 60, 1),
      createInitialIngredient('Chorizo', 50, 'g', 225, 12, 1, 19),
      createInitialIngredient('Zanahoria', 80, 'g', 33, 0.7, 7.8, 0.2),
      createInitialIngredient('Cebolla', 50, 'g', 20, 0.6, 4.7, 0.1),
    ],
    imageUrl: findImage('lentil stew')?.imageUrl,
    imageHint: findImage('lentil stew')?.imageHint,
  },
  {
    id: '6',
    name: 'Pasta a la Carbonara',
    description: 'La auténtica receta italiana con guanciale, huevo y queso pecorino.',
    instructions: '1. Cocina la pasta. 2. Sofríe el guanciale. 3. Mezcla yemas de huevo con queso rallado. 4. Escurre la pasta y mezcla todo fuera del fuego.',
    calories: 750,
    protein: 35,
    carbs: 90,
    fat: 30,
    ingredients: [
      createInitialIngredient('Espaguetis', 100, 'g', 371, 13, 75, 1.5),
      createInitialIngredient('Guanciale', 50, 'g', 337, 4.5, 0, 35),
      createInitialIngredient('Yema de Huevo', 40, 'g', 130, 6.4, 1.4, 11),
      createInitialIngredient('Queso Pecorino', 30, 'g', 117, 7.5, 0.4, 9.6),
    ],
    imageUrl: findImage('pasta carbonara')?.imageUrl,
    imageHint: findImage('pasta carbonara')?.imageHint,
  },
  {
    id: '7',
    name: 'Pudding de Chía',
    description: 'Un desayuno o postre saludable, lleno de fibra y Omega-3.',
    instructions: '1. Mezcla las semillas de chía con la leche y el sirope. 2. Deja reposar en la nevera al menos 4 horas. 3. Sirve con fruta fresca.',
    calories: 300,
    protein: 8,
    carbs: 30,
    fat: 16,
    ingredients: [
        createInitialIngredient('Semillas de Chía', 30, 'g', 146, 5, 12.5, 9),
        createInitialIngredient('Leche de Almendras', 200, 'ml', 60, 2, 2, 5),
        createInitialIngredient('Sirope de Arce', 15, 'ml', 52, 0, 13, 0),
    ],
    imageUrl: findImage('chia pudding')?.imageUrl,
    imageHint: findImage('chia pudding')?.imageHint,
  },
  {
    id: '8',
    name: 'Tostada de Aguacate y Huevo',
    description: 'Un clásico del brunch, rápido, fácil y nutritivo.',
    instructions: '1. Tuesta el pan. 2. Machaca el aguacate y úntalo sobre la tostada. 3. Cocina un huevo poché o frito y colócalo encima. 4. Sazona al gusto.',
    calories: 400,
    protein: 15,
    carbs: 30,
    fat: 25,
    ingredients: [
        createInitialIngredient('Pan Integral', 80, 'g', 212, 10.4, 38, 2.8),
        createInitialIngredient('Aguacate', 100, 'g', 160, 2, 8.5, 15),
        createInitialIngredient('Huevo', 50, 'g', 78, 6.3, 0.6, 5.3),
    ],
    imageUrl: findImage('avocado toast')?.imageUrl,
    imageHint: findImage('avocado toast')?.imageHint,
  },
  {
    id: '9',
    name: 'Avena Nocturna',
    description: 'Prepara tu desayuno la noche anterior para una mañana sin estrés.',
    instructions: '1. En un frasco, mezcla avena, leche, semillas de chía y tu endulzante preferido. 2. Remueve bien y deja en la nevera toda la noche. 3. Por la mañana, añade tus toppings favoritos como fruta fresca o nueces.',
    calories: 380,
    protein: 14,
    carbs: 55,
    fat: 12,
    ingredients: [
      createInitialIngredient('Avena', 60, 'g', 232, 10, 41, 5),
      // Repeated ingredient with full data to ensure migration works
      createInitialIngredient('Leche', 180, 'ml', 85, 6, 8.6, 2), 
      createInitialIngredient('Semillas de Chía', 15, 'g', 73, 2.5, 6, 4.5),
    ],
    imageUrl: findImage('overnight oats')?.imageUrl || findImage('oatmeal berries')?.imageUrl,
    imageHint: 'overnight oats',
  },
  {
    id: '10',
    name: 'Batido de Proteínas',
    description: 'Un batido rápido y eficaz para la recuperación muscular post-entrenamiento.',
    instructions: '1. Añade todos los ingredientes a la batidora. 2. Mezcla hasta obtener una consistencia suave. 3. Sirve inmediatamente.',
    calories: 350,
    protein: 35,
    carbs: 40,
    fat: 5,
    ingredients: [
      createInitialIngredient('Proteína en Polvo', 30, 'g', 120, 25, 2, 2),
      createInitialIngredient('Plátano', 100, 'g', 89, 1.1, 23, 0.3),
      // Repeated ingredient with full data
      createInitialIngredient('Leche de Almendras', 250, 'ml', 75, 2.5, 2.5, 6.25),
    ],
    imageUrl: findImage('protein shake')?.imageUrl,
    imageHint: 'protein shake',
  },
  {
    id: '11',
    name: 'Batido de Yogur y Frutas',
    description: 'Un batido cremoso y refrescante, ideal para un desayuno ligero o merienda.',
    instructions: '1. Pon el yogur, los frutos rojos y la miel en una batidora. 2. Mezcla hasta que esté homogéneo. 3. Sirve frío.',
    calories: 280,
    protein: 20,
    carbs: 35,
    fat: 6,
    ingredients: [
      createInitialIngredient('Yogur Griego', 150, 'g', 146, 15, 6, 7.5),
      // Repeated ingredient with full data
      createInitialIngredient('Frutos Rojos', 100, 'g', 57, 1, 13, 0.3),
      createInitialIngredient('Miel', 15, 'ml', 48, 0, 13, 0),
    ],
    imageUrl: findImage('yogurt smoothie')?.imageUrl,
    imageHint: 'yogurt smoothie',
  },
  {
    id: '12',
    name: 'Bowl de Quinoa',
    description: 'Un plato completo y versátil, lleno de proteínas y nutrientes.',
    instructions: '1. Cocina la quinoa según las instrucciones del paquete. 2. Saltea tus vegetales favoritos. 3. Monta el bowl con la quinoa como base, añade los vegetales, el pollo y el aguacate. 4. Aliña al gusto.',
    calories: 550,
    protein: 30,
    carbs: 60,
    fat: 22,
    ingredients: [
      createInitialIngredient('Quinoa', 80, 'g', 297, 11.2, 53, 4.9),
      createInitialIngredient('Pechuga de Pollo', 100, 'g', 130, 25, 0, 3),
      createInitialIngredient('Brócoli', 100, 'g', 34, 2.8, 7, 0.4),
      createInitialIngredient('Aguacate', 50, 'g', 80, 1, 4.25, 7.5),
    ],
    imageUrl: findImage('quinoa bowl')?.imageUrl,
    imageHint: 'quinoa bowl',
  },
];

const defaultMeals: Omit<Meal, 'id'>[] = [
  { title: 'Desayuno', recipes: [] },
  { title: 'Almuerzo', recipes: [] },
  { title: 'Merienda', recipes: [] },
  { title: 'Cena', recipes: [] },
];

const createDayPlan = (day: DayPlan['day']): DayPlan => ({
    day,
    meals: defaultMeals.map((meal, index) => ({ 
        ...meal, 
        id: `m-${index}-${day.toLowerCase()}`, // Ensure unique ID for each meal slot
        recipes: [] 
    })),
});

export const INITIAL_WEEK_PLAN: WeekPlan = [
  createDayPlan('Lunes'),
  createDayPlan('Martes'),
  createDayPlan('Miércoles'),
  createDayPlan('Jueves'),
  createDayPlan('Viernes'),
  createDayPlan('Sábado'),
  createDayPlan('Domingo'),
];

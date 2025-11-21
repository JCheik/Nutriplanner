import type { Recipe, WeekPlan, Meal, DayPlan, Ingredient } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (hint: string) => PlaceHolderImages.find(img => img.imageHint.includes(hint));

// Helper to create ingredients with full macros for initial migration
const createInitialIngredient = (name: string, quantity: number, unit: string, calories: number, protein: number, carbs: number, fat: number): Ingredient => ({
    id: `ing-${name.toLowerCase().replace(' ', '-')}-${Math.random()}`,
    name,
    quantity,
    unit,
    // @ts-ignore
    calories,
    // @ts-ignore
    protein,
    // @ts-ignore
    carbs,
    // @ts-ignore
    fat,
});

// NOTE: The macros within each ingredient are for reference during initial migration ONLY.
// The final recipe object created in the app will NOT store these macros inside the ingredients array.
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
      createInitialIngredient('Lechuga', 100, 'g', 15, 1.4, 2.9, 0.2),
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
      createInitialIngredient('Pechuga de Pollo', 200, 'g', 330, 62, 0, 7.2),
      createInitialIngredient('Aceite de Oliva', 5, 'ml', 44, 0, 0, 5),
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
       createInitialIngredient('Avena', 80, 'g', 311, 13.5, 55, 5.5),
       createInitialIngredient('Frutos Rojos', 150, 'g', 85, 1, 20, 0.5),
       createInitialIngredient('Leche', 200, 'ml', 92, 6.6, 9.6, 2),
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
      createInitialIngredient('Salmón', 180, 'g', 374, 36, 0, 25),
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
      createInitialIngredient('Lentejas', 100, 'g', 353, 26, 60, 1.1),
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
      createInitialIngredient('Guanciale', 50, 'g', 300, 13, 0, 28),
      createInitialIngredient('Yema de Huevo', 40, 'g', 130, 6, 0.2, 11),
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
        createInitialIngredient('Semillas de Chía', 30, 'g', 146, 5, 12.6, 9.2),
        createInitialIngredient('Leche de Almendras', 200, 'ml', 30, 1, 1, 2.5),
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
        createInitialIngredient('Pan Integral', 80, 'g', 212, 11, 41, 3),
        createInitialIngredient('Aguacate', 100, 'g', 160, 2, 9, 15),
        createInitialIngredient('Huevo', 50, 'g', 78, 6, 0.6, 5),
    ],
    imageUrl: findImage('avocado toast')?.imageUrl,
    imageHint: findImage('avocado toast')?.imageHint,
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

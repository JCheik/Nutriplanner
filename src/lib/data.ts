import type { Recipe, WeekPlan, Meal, DayPlan } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (hint: string) => PlaceHolderImages.find(img => img.imageHint.includes(hint));

// NOTE: The macros within each ingredient are now for reference during initial creation only.
// The final recipe object will NOT store these macros inside the ingredients array.
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
      { id: 'i1', name: 'Lechuga', quantity: 100, unit: 'g' },
      { id: 'i2', name: 'Tomate', quantity: 150, unit: 'g' },
      { id: 'i3', name: 'Queso Feta', quantity: 50, unit: 'g' },
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
      { id: 'i4', name: 'Pechuga de Pollo', quantity: 200, unit: 'g' },
      { id: 'i5', name: 'Aceite de Oliva', quantity: 5, unit: 'ml' },
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
      { id: 'i6', name: 'Avena', quantity: 80, unit: 'g' },
      { id: 'i7', name: 'Frutos Rojos', quantity: 150, unit: 'g' },
      { id: 'i8', name: 'Leche', quantity: 200, unit: 'ml' },
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
      { id: 'i9', name: 'Salmón', quantity: 180, unit: 'g' },
      { id: 'i10', name: 'Espárragos', quantity: 150, unit: 'g' },
      { id: 'i11', name: 'Limón', quantity: 30, unit: 'g' },
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
      { id: 'i12', name: 'Lentejas', quantity: 100, unit: 'g' },
      { id: 'i13', name: 'Chorizo', quantity: 50, unit: 'g' },
      { id: 'i14', name: 'Zanahoria', quantity: 80, unit: 'g' },
      { id: 'i15', name: 'Cebolla', quantity: 50, unit: 'g' },
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
      { id: 'i16', name: 'Espaguetis', quantity: 100, unit: 'g' },
      { id: 'i17', name: 'Guanciale', quantity: 50, unit: 'g' },
      { id: 'i18', name: 'Yema de Huevo', quantity: 40, unit: 'g' },
      { id: 'i19', name: 'Queso Pecorino', quantity: 30, unit: 'g' },
    ],
    imageUrl: findImage('pasta carbonara')?.imageUrl,
    imageHint: findImage('pasta carbonara')?.imageHint,
  }
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

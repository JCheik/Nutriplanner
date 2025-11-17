import type { Recipe, WeekPlan } from './types';

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
      { id: 'i1', name: 'Lechuga', quantity: 100, unit: 'g', calories: 15, protein: 1, carbs: 3, fat: 0.2 },
      { id: 'i2', name: 'Tomate', quantity: 150, unit: 'g', calories: 27, protein: 1.3, carbs: 5.8, fat: 0.3 },
      { id: 'i3', name: 'Queso Feta', quantity: 50, unit: 'g', calories: 132, protein: 7.1, carbs: 2.1, fat: 10.6 },
    ],
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
      { id: 'i4', name: 'Pechuga de Pollo', quantity: 200, unit: 'g', calories: 260, protein: 50, carbs: 0, fat: 6 },
      { id: 'i5', name: 'Aceite de Oliva', quantity: 5, unit: 'ml', calories: 44, protein: 0, carbs: 0, fat: 5 },
    ],
  },
];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Lunes', meals: { breakfast: { id: 'm1', recipes: [] }, lunch: { id: 'm2', recipes: [] }, snack: { id: 'm22', recipes: [] }, dinner: { id: 'm3', recipes: [] } } },
  { day: 'Martes', meals: { breakfast: { id: 'm4', recipes: [] }, lunch: { id: 'm5', recipes: [] }, snack: { id: 'm23', recipes: [] }, dinner: { id: 'm6', recipes: [] } } },
  { day: 'Miércoles', meals: { breakfast: { id: 'm7', recipes: [] }, lunch: { id: 'm8', recipes: [] }, snack: { id: 'm24', recipes: [] }, dinner: { id: 'm9', recipes: [] } } },
  { day: 'Jueves', meals: { breakfast: { id: 'm10', recipes: [] }, lunch: { id: 'm11', recipes: [] }, snack: { id: 'm25', recipes: [] }, dinner: { id: 'm12', recipes: [] } } },
  { day: 'Viernes', meals: { breakfast: { id: 'm13', recipes: [] }, lunch: { id: 'm14', recipes: [] }, snack: { id: 'm26', recipes: [] }, dinner: { id: 'm15', recipes: [] } } },
  { day: 'Sábado', meals: { breakfast: { id: 'm16', recipes: [] }, lunch: { id: 'm17', recipes: [] }, snack: { id: 'm27', recipes: [] }, dinner: { id: 'm18', recipes: [] } } },
  { day: 'Domingo', meals: { breakfast: { id: 'm19', recipes: [] }, lunch: { id: 'm20', recipes: [] }, snack: { id: 'm28', recipes: [] }, dinner: { id: 'm21', recipes: [] } } },
];

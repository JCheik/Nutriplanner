import type { Recipe, WeekPlan } from './types';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Ensalada Griega Clásica',
    description: 'Una ensalada refrescante y saludable con queso feta y aceitunas.',
    instructions: '1. Picar las verduras. 2. Batir el aderezo. 3. Combinar y mezclar. 4. Cubrir con queso feta y aceitunas.',
    calories: 350,
    protein: 10,
    carbs: 15,
    fat: 28,
    ingredients: [
      { id: 'i1', name: 'Pepino', quantity: 1, unit: 'mediano', calories: 45, protein: 2, carbs: 11, fat: 0 },
      { id: 'i2', name: 'Tomate', quantity: 2, unit: 'grandes', calories: 60, protein: 2, carbs: 14, fat: 1 },
      { id: 'i3', name: 'Queso Feta', quantity: 100, unit: 'g', calories: 264, protein: 14, carbs: 4, fat: 21 },
    ],
  },
  {
    id: '2',
    name: 'Espaguetis a la Carbonara',
    description: 'Un plato de pasta italiano simple pero delicioso.',
    instructions: '1. Cocer los espaguetis. 2. Freír la panceta. 3. Batir los huevos y el queso. 4. Combinar todo fuera del fuego.',
    calories: 600,
    protein: 25,
    carbs: 70,
    fat: 25,
    ingredients: [
      { id: 'i4', name: 'Espaguetis', quantity: 100, unit: 'g', calories: 350, protein: 12, carbs: 70, fat: 1 },
      { id: 'i5', name: 'Panceta', quantity: 50, unit: 'g', calories: 250, protein: 10, carbs: 0, fat: 23 },
      { id: 'i6', name: 'Huevo', quantity: 1, unit: 'grande', calories: 70, protein: 6, carbs: 1, fat: 5 },
    ],
  },
  {
    id: '3',
    name: 'Pechuga de Pollo a la Parrilla',
    description: 'Pechuga de pollo jugosa y tierna, perfecta para cualquier comida.',
    instructions: '1. Sazonar el pollo. 2. Asar a la parrilla durante 6-8 minutos por cada lado. 3. Dejar reposar antes de cortar.',
    calories: 330,
    protein: 60,
    carbs: 0,
    fat: 9,
    ingredients: [
      { id: 'i7', name: 'Pechuga de Pollo', quantity: 200, unit: 'g', calories: 330, protein: 60, carbs: 0, fat: 9 },
    ],
  },
];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Lunes', meals: { breakfast: { id: 'm1', recipes: [] }, lunch: { id: 'm2', recipes: [INITIAL_RECIPES[0]] }, snack: { id: 'm22', recipes: [] }, dinner: { id: 'm3', recipes: [] } } },
  { day: 'Martes', meals: { breakfast: { id: 'm4', recipes: [] }, lunch: { id: 'm5', recipes: [] }, snack: { id: 'm23', recipes: [] }, dinner: { id: 'm6', recipes: [INITIAL_RECIPES[2]] } } },
  { day: 'Miércoles', meals: { breakfast: { id: 'm7', recipes: [] }, lunch: { id: 'm8', recipes: [] }, snack: { id: 'm24', recipes: [] }, dinner: { id: 'm9', recipes: [] } } },
  { day: 'Jueves', meals: { breakfast: { id: 'm10', recipes: [] }, lunch: { id: 'm11', recipes: [INITIAL_RECIPES[0]] }, snack: { id: 'm25', recipes: [] }, dinner: { id: 'm12', recipes: [INITIAL_RECIPES[1]] } } },
  { day: 'Viernes', meals: { breakfast: { id: 'm13', recipes: [] }, lunch: { id: 'm14', recipes: [] }, snack: { id: 'm26', recipes: [] }, dinner: { id: 'm15', recipes: [] } } },
  { day: 'Sábado', meals: { breakfast: { id: 'm16', recipes: [] }, lunch: { id: 'm17', recipes: [] }, snack: { id: 'm27', recipes: [] }, dinner: { id: 'm18', recipes: [] } } },
  { day: 'Domingo', meals: { breakfast: { id: 'm19', recipes: [] }, lunch: { id: 'm20', recipes: [] }, snack: { id: 'm28', recipes: [] }, dinner: { id: 'm21', recipes: [] } } },
];

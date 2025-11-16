import type { Recipe, WeekPlan } from './types';
import { PlaceHolderImages } from './placeholder-images';

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
    imageUrl: PlaceHolderImages.find(img => img.id === '1')?.imageUrl,
    ingredients: [
      { id: 'i1', name: 'Pepino', quantity: 1, unit: 'mediano', calories: 45, protein: 2, carbs: 11, fat: 0 },
      { id: 'i2', name: 'Tomates', quantity: 2, unit: 'grandes', calories: 60, protein: 2, carbs: 14, fat: 1 },
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
    imageUrl: PlaceHolderImages.find(img => img.id === '2')?.imageUrl,
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
    imageUrl: PlaceHolderImages.find(img => img.id === '3')?.imageUrl,
    ingredients: [
      { id: 'i7', name: 'Pechuga de Pollo', quantity: 200, unit: 'g', calories: 330, protein: 60, carbs: 0, fat: 9 },
    ],
  },
];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Lunes', meals: { breakfast: { id: 'm1', recipe: null }, lunch: { id: 'm2', recipe: INITIAL_RECIPES[0] }, dinner: { id: 'm3', recipe: null } } },
  { day: 'Martes', meals: { breakfast: { id: 'm4', recipe: null }, lunch: { id: 'm5', recipe: null }, dinner: { id: 'm6', recipe: INITIAL_RECIPES[2] } } },
  { day: 'Miércoles', meals: { breakfast: { id: 'm7', recipe: null }, lunch: { id: 'm8', recipe: null }, dinner: { id: 'm9', recipe: null } } },
  { day: 'Jueves', meals: { breakfast: { id: 'm10', recipe: null }, lunch: { id: 'm11', recipe: INITIAL_RECIPES[0] }, dinner: { id: 'm12', recipe: INITIAL_RECIPES[1] } } },
  { day: 'Viernes', meals: { breakfast: { id: 'm13', recipe: null }, lunch: { id: 'm14', recipe: null }, dinner: { id: 'm15', recipe: null } } },
  { day: 'Sábado', meals: { breakfast: { id: 'm16', recipe: null }, lunch: { id: 'm17', recipe: null }, dinner: { id: 'm18', recipe: null } } },
  { day: 'Domingo', meals: { breakfast: { id: 'm19', recipe: null }, lunch: { id: 'm20', recipe: null }, dinner: { id: 'm21', recipe: null } } },
];

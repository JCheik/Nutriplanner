import type { Recipe, WeekPlan } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (hint: string) => PlaceHolderImages.find(img => img.imageHint.includes(hint));

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
      { id: 'i4', name: 'Pechuga de Pollo', quantity: 200, unit: 'g', calories: 260, protein: 50, carbs: 0, fat: 6 },
      { id: 'i5', name: 'Aceite de Oliva', quantity: 5, unit: 'ml', calories: 44, protein: 0, carbs: 0, fat: 5 },
    ],
    imageUrl: findImage('grilled chicken')?.imageUrl,
    imageHint: findImage('grilled chicken')?.imageHint,
  },
];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Lunes', meals: [ { id: 'm1', title: 'Desayuno', recipes: [] }, { id: 'm2', title: 'Almuerzo', recipes: [INITIAL_RECIPES[0]] }, { id: 'm22', title: 'Merienda', recipes: [] }, { id: 'm3', title: 'Cena', recipes: [] } ] },
  { day: 'Martes', meals: [ { id: 'm4', title: 'Desayuno', recipes: [] }, { id: 'm5', title: 'Almuerzo', recipes: [] }, { id: 'm23', title: 'Merienda', recipes: [] }, { id: 'm6', title: 'Cena', recipes: [INITIAL_RECIPES[1]] } ] },
  { day: 'Miércoles', meals: [ { id: 'm7', title: 'Desayuno', recipes: [] }, { id: 'm8', title: 'Almuerzo', recipes: [] }, { id: 'm24', title: 'Merienda', recipes: [] }, { id: 'm9', title: 'Cena', recipes: [] } ] },
  { day: 'Jueves', meals: [ { id: 'm10', title: 'Desayuno', recipes: [] }, { id: 'm11', title: 'Almuerzo', recipes: [] }, { id: 'm25', title: 'Merienda', recipes: [] }, { id: 'm12', title: 'Cena', recipes: [] } ] },
  { day: 'Viernes', meals: [ { id: 'm13', title: 'Desayuno', recipes: [] }, { id: 'm14', title: 'Almuerzo', recipes: [] }, { id: 'm26', title: 'Merienda', recipes: [] }, { id: 'm15', title: 'Cena', recipes: [] } ] },
  { day: 'Sábado', meals: [ { id: 'm16', title: 'Desayuno', recipes: [] }, { id: 'm17', title: 'Almuerzo', recipes: [] }, { id: 'm27', title: 'Merienda', recipes: [] }, { id: 'm18', title: 'Cena', recipes: [] } ] },
  { day: 'Domingo', meals: [ { id: 'm19', title: 'Desayuno', recipes: [] }, { id: 'm20', title: 'Almuerzo', recipes: [] }, { id: 'm28', title: 'Merienda', recipes: [] }, { id: 'm21', title: 'Cena', recipes: [] } ] },
];

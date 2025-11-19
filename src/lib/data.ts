import type { Recipe, WeekPlan, Meal, DayPlan } from './types';
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

const defaultMeals: Meal[] = [
  { id: 'm-breakfast', title: 'Desayuno', recipes: [] },
  { id: 'm-lunch', title: 'Almuerzo', recipes: [] },
  { id: 'm-snack', title: 'Merienda', recipes: [] },
  { id: 'm-dinner', title: 'Cena', recipes: [] },
];

const createDayPlan = (day: DayPlan['day']): DayPlan => ({
    day,
    meals: defaultMeals.map(meal => ({ 
        ...meal, 
        id: `${meal.id}-${day.toLowerCase()}`, 
        recipes: [...meal.recipes] 
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

// Pre-populate some meals for demonstration
const lunesPlan = INITIAL_WEEK_PLAN.find(d => d.day === 'Lunes');
if (lunesPlan) {
    const lunch = lunesPlan.meals.find(m => m.title === 'Almuerzo');
    if (lunch) lunch.recipes.push(INITIAL_RECIPES[0]);
}

const martesPlan = INITIAL_WEEK_PLAN.find(d => d.day === 'Martes');
if (martesPlan) {
    const dinner = martesPlan.meals.find(m => m.title === 'Cena');
    if (dinner) dinner.recipes.push(INITIAL_RECIPES[1]);
}

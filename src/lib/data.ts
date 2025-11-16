import type { Recipe, WeekPlan } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Classic Greek Salad',
    description: 'A refreshing and healthy salad with feta cheese and olives.',
    instructions: '1. Chop vegetables. 2. Whisk dressing. 3. Combine and toss. 4. Top with feta and olives.',
    calories: 350,
    protein: 10,
    carbs: 15,
    fat: 28,
    imageUrl: PlaceHolderImages.find(img => img.id === '1')?.imageUrl,
    ingredients: [
      { id: 'i1', name: 'Cucumber', quantity: 1, unit: 'medium', calories: 45, protein: 2, carbs: 11, fat: 0 },
      { id: 'i2', name: 'Tomatoes', quantity: 2, unit: 'large', calories: 60, protein: 2, carbs: 14, fat: 1 },
      { id: 'i3', name: 'Feta Cheese', quantity: 100, unit: 'g', calories: 264, protein: 14, carbs: 4, fat: 21 },
    ],
  },
  {
    id: '2',
    name: 'Spaghetti Carbonara',
    description: 'A simple yet delicious Italian pasta dish.',
    instructions: '1. Cook spaghetti. 2. Fry pancetta. 3. Whisk eggs and cheese. 4. Combine everything off-heat.',
    calories: 600,
    protein: 25,
    carbs: 70,
    fat: 25,
    imageUrl: PlaceHolderImages.find(img => img.id === '2')?.imageUrl,
    ingredients: [
      { id: 'i4', name: 'Spaghetti', quantity: 100, unit: 'g', calories: 350, protein: 12, carbs: 70, fat: 1 },
      { id: 'i5', name: 'Pancetta', quantity: 50, unit: 'g', calories: 250, protein: 10, carbs: 0, fat: 23 },
      { id: 'i6', name: 'Egg', quantity: 1, unit: 'large', calories: 70, protein: 6, carbs: 1, fat: 5 },
    ],
  },
  {
    id: '3',
    name: 'Grilled Chicken Breast',
    description: 'Juicy and tender grilled chicken, perfect for any meal.',
    instructions: '1. Season chicken. 2. Grill for 6-8 minutes per side. 3. Let it rest before slicing.',
    calories: 330,
    protein: 60,
    carbs: 0,
    fat: 9,
    imageUrl: PlaceHolderImages.find(img => img.id === '3')?.imageUrl,
    ingredients: [
      { id: 'i7', name: 'Chicken Breast', quantity: 200, unit: 'g', calories: 330, protein: 60, carbs: 0, fat: 9 },
    ],
  },
];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Monday', meals: { breakfast: { id: 'm1', recipe: null }, lunch: { id: 'm2', recipe: INITIAL_RECIPES[0] }, dinner: { id: 'm3', recipe: null } } },
  { day: 'Tuesday', meals: { breakfast: { id: 'm4', recipe: null }, lunch: { id: 'm5', recipe: null }, dinner: { id: 'm6', recipe: INITIAL_RECIPES[2] } } },
  { day: 'Wednesday', meals: { breakfast: { id: 'm7', recipe: null }, lunch: { id: 'm8', recipe: null }, dinner: { id: 'm9', recipe: null } } },
  { day: 'Thursday', meals: { breakfast: { id: 'm10', recipe: null }, lunch: { id: 'm11', recipe: INITIAL_RECIPES[0] }, dinner: { id: 'm12', recipe: INITIAL_RECIPES[1] } } },
  { day: 'Friday', meals: { breakfast: { id: 'm13', recipe: null }, lunch: { id: 'm14', recipe: null }, dinner: { id: 'm15', recipe: null } } },
  { day: 'Saturday', meals: { breakfast: { id: 'm16', recipe: null }, lunch: { id: 'm17', recipe: null }, dinner: { id: 'm18', recipe: null } } },
  { day: 'Sunday', meals: { breakfast: { id: 'm19', recipe: null }, lunch: { id: 'm20', recipe: null }, dinner: { id: 'm21', recipe: null } } },
];

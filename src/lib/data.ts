import type { Recipe, WeekPlan } from './types';

export const INITIAL_RECIPES: Recipe[] = [];

export const INITIAL_WEEK_PLAN: WeekPlan = [
  { day: 'Lunes', meals: { breakfast: { id: 'm1', recipes: [] }, lunch: { id: 'm2', recipes: [] }, snack: { id: 'm22', recipes: [] }, dinner: { id: 'm3', recipes: [] } } },
  { day: 'Martes', meals: { breakfast: { id: 'm4', recipes: [] }, lunch: { id: 'm5', recipes: [] }, snack: { id: 'm23', recipes: [] }, dinner: { id: 'm6', recipes: [] } } },
  { day: 'Miércoles', meals: { breakfast: { id: 'm7', recipes: [] }, lunch: { id: 'm8', recipes: [] }, snack: { id: 'm24', recipes: [] }, dinner: { id: 'm9', recipes: [] } } },
  { day: 'Jueves', meals: { breakfast: { id: 'm10', recipes: [] }, lunch: { id: 'm11', recipes: [] }, snack: { id: 'm25', recipes: [] }, dinner: { id: 'm12', recipes: [] } } },
  { day: 'Viernes', meals: { breakfast: { id: 'm13', recipes: [] }, lunch: { id: 'm14', recipes: [] }, snack: { id: 'm26', recipes: [] }, dinner: { id: 'm15', recipes: [] } } },
  { day: 'Sábado', meals: { breakfast: { id: 'm16', recipes: [] }, lunch: { id: 'm17', recipes: [] }, snack: { id: 'm27', recipes: [] }, dinner: { id: 'm18', recipes: [] } } },
  { day: 'Domingo', meals: { breakfast: { id: 'm19', recipes: [] }, lunch: { id: 'm20', recipes: [] }, snack: { id: 'm28', recipes: [] }, dinner: { id: 'm21', recipes: [] } } },
];

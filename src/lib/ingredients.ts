export interface BaseIngredient {
  name: string;
  // per 100g or 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: 'g' | 'ml';
}

export const ingredientsDB: BaseIngredient[] = [
  { name: 'Pechuga de Pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g' },
  { name: 'Salmón', calories: 208, protein: 20, carbs: 0, fat: 13, unit: 'g' },
  { name: 'Huevo', calories: 155, protein: 13, carbs: 1.1, fat: 11, unit: 'g' },
  { name: 'Tofu', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, unit: 'g' },
  { name: 'Frijoles Negros', calories: 132, protein: 8.9, carbs: 24, fat: 0.5, unit: 'g' },
  { name: 'Quinoa', calories: 120, protein: 4.1, carbs: 21, fat: 1.9, unit: 'g' },
  { name: 'Arroz Integral', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, unit: 'g' },
  { name: 'Pasta', calories: 131, protein: 5, carbs: 25, fat: 1.1, unit: 'g' },
  { name: 'Espaguetis', calories: 158, protein: 6, carbs: 31, fat: 1, unit: 'g' },
  { name: 'Aceite de Oliva', calories: 884, protein: 0, carbs: 0, fat: 100, unit: 'ml' },
  { name: 'Mantequilla', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unit: 'g' },
  { name: 'Tomate', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: 'g' },
  { name: 'Pepino', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, unit: 'g' },
  { name: 'Espinacas', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: 'g' },
  { name: 'Brócoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: 'g' },
  { name: 'Cebolla', calories: 40, protein: 1.1, carbs: 9, fat: 0.1, unit: 'g' },
  { name: 'Ajo', calories: 149, protein: 6.4, carbs: 33, fat: 0.5, unit: 'g' },
  { name: 'Queso Feta', calories: 264, protein: 14, carbs: 4.1, fat: 21, unit: 'g' },
  { name: 'Panceta', calories: 541, protein: 11, carbs: 0, fat: 55, unit: 'g' },
  { name: 'Queso Parmesano', calories: 431, protein: 38, carbs: 4.1, fat: 29, unit: 'g' },
  { name: 'Aguacate', calories: 160, protein: 2, carbs: 9, fat: 15, unit: 'g' },
  { name: 'Lechuga', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, unit: 'g' },
  { name: 'Pimiento', calories: 31, protein: 1, carbs: 6, fat: 0.3, unit: 'g' },
];

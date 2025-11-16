export interface BaseIngredient {
  name: string;
  // per 100g or 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: 'g' | 'ml';
}

export const ingredientsDB: BaseIngredient[] = [];

export interface BaseIngredient {
  name: string;
  // per 100g or 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: 'g' | 'ml';
}

/**
 * ¡AQUÍ VA TU BASE DE DATOS DE ALIMENTOS!
 * 
 * Para añadir tus alimentos desde un Excel:
 * 1. Asegúrate de que tu Excel tiene las columnas: name, calories, protein, carbs, fat, unit.
 * 2. Usa un conversor online (busca "Excel a JSON") para convertir tu archivo.
 * 3. Copia el resultado del conversor.
 * 4. Pega el contenido copiado aquí, reemplazando los datos de ejemplo de abajo.
 * 
 * Ejemplo de formato:
 * [
 *   { "name": "Pechuga de Pollo", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "unit": "g" },
 *   { "name": "Arroz Blanco", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "unit": "g" }
 * ]
 */
export const ingredientsDB: BaseIngredient[] = [
  { "name": "Pechuga de Pollo", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "unit": "g" },
  { "name": "Salmón", "calories": 208, "protein": 20, "carbs": 0, "fat": 13, "unit": "g" },
  { "name": "Huevo", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "unit": "g" },
  { "name": "Arroz Blanco", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "unit": "g" },
  { "name": "Brócoli", "calories": 55, "protein": 3.7, "carbs": 11, "fat": 0.6, "unit": "g" },
  { "name": "Tomate", "calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "unit": "g" },
  { "name": "Aceite de Oliva", "calories": 884, "protein": 0, "carbs": 0, "fat": 100, "unit": "ml" }
];

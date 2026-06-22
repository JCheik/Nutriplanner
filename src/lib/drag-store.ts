import { Recipe } from './types';

let draggedRecipe: Recipe | null = null;
const listeners = new Set<(recipe: Recipe | null) => void>();

export const dragStore = {
  getDraggedRecipe: () => draggedRecipe,
  setDraggedRecipe: (recipe: Recipe | null) => {
    draggedRecipe = recipe;
    listeners.forEach((listener) => listener(recipe));
  },
  subscribe: (listener: (recipe: Recipe | null) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

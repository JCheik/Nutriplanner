'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { FloatingMenu } from '@/components/nutri-planner/floating-menu';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { EmptyFridgeScanner } from '@/components/nutri-planner/empty-fridge-scanner';
import { WelcomeGuide } from '@/components/nutri-planner/welcome-guide';
import { AssistantDialog } from '@/components/nutri-planner/assistant-dialog';
import { RecipeImportDialog } from '@/components/nutri-planner/recipe-import-dialog';
import { AutocompletePreferencesDialog } from '@/components/nutri-planner/autocomplete-preferences-dialog';

export default function DashboardPage() {
  const {
    // Recipe state
    currentUserRecipes, nutriplannerRecipes, isSaving,
    handleSaveRecipe, handleDeleteRecipe, handleCopyRecipe,
    // Week plan state
    currentWeekPlan, dailyTotals,
    handleDrop, handleClearMeal, handleClearDay, handleClearWeek, handleRemoveRecipeFromMeal,
    handleUpdateMealTitle, handleUpdateMealTypes, handleAddMeal, handleDeleteMeal, handleUpdateServingsEaten,
    // User profile state
    currentStickyNote, currentCalorieResult, activeGoalMacros, currentShoppingList, currentDietPreference, activeGoal,
    handleNoteSave, handleCalorieResultSave, handleActiveGoalChange, handleSaveCustomGoal, handleShoppingListUpdate, handleDietPreferenceChange,
    // UI state
    dialogState, activePanel, activeDropTarget, setActiveDropTarget,
    isRecipeSelectorOpen, setIsRecipeSelectorOpen, selectedMealForAddition,
    isAutocompleting, isPreferencesDialogOpen, setIsPreferencesDialogOpen,
    // Handlers
    handleRecipeAction, handleDialogClose, handleAddToPlan,
    handleInternalSaveRecipe, handleInternalDeleteRecipe,
    handleMealSlotClick, handleRecipeSelectionSave,
    handlePanelOpen, handlePanelChange,
    handleAiRecipeGenerated, handleAutocompleteWeek, handleRunAutocomplete,
  } = useDashboard();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
        <div className="w-full" data-tour="meal-planner">
          <MealPlanner
            weekPlan={currentWeekPlan}
            dailyTotals={dailyTotals}
            activeGoal={activeGoalMacros || null}
            onDrop={handleDrop}
            onClearMeal={handleClearMeal}
            onClearDay={handleClearDay}
            onClearWeek={handleClearWeek}
            onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
            onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            onUpdateMealTitle={handleUpdateMealTitle}
            onUpdateMealTypes={handleUpdateMealTypes}
            onAddMeal={handleAddMeal}
            onDeleteMeal={handleDeleteMeal}
            activeDropTarget={activeDropTarget}
            onSetDropTarget={setActiveDropTarget}
            onMealSlotClick={handleMealSlotClick}
            onAutocomplete={handleAutocompleteWeek}
            isAutocompleting={isAutocompleting}
            onUpdateServingsEaten={handleUpdateServingsEaten}
          />
        </div>
        <div className="grid grid-cols-1 gap-6" data-tour="recipe-library">
          <RecipeLibrary
            userRecipes={currentUserRecipes}
            nutriplannerRecipes={nutriplannerRecipes}
            onRecipeAction={handleRecipeAction}
            onCopyRecipe={handleCopyRecipe}
            onAddToPlan={handleAddToPlan}
            onAssistantOpen={() => handlePanelOpen('assistant')}
            onEmptyFridgeOpen={() => handlePanelOpen('empty-fridge')}
            onRecipeImportOpen={() => handlePanelOpen('recipe-import')}
            dietPreference={currentDietPreference}
          />
        </div>
      </div>

      <RecipeDialog
        dialogState={dialogState}
        isSaving={isSaving}
        onClose={handleDialogClose}
        onSave={handleInternalSaveRecipe}
        onDelete={handleInternalDeleteRecipe}
        onEdit={(recipe, isGlobal) => handleRecipeAction('edit', recipe, isGlobal)}
        onCopy={handleCopyRecipe}
      />

      <FloatingMenu onPanelOpen={handlePanelOpen} />

      <WelcomeGuide />

      <AssistantDialog
        isOpen={activePanel === 'assistant'}
        onClose={() => handlePanelChange('assistant', false)}
        weekPlan={currentWeekPlan}
        userRecipes={currentUserRecipes}
        nutriplannerRecipes={nutriplannerRecipes}
        activeGoalMacros={activeGoalMacros || null}
        dietPreference={currentDietPreference}
        onDrop={handleDrop}
        onClearMeal={handleClearMeal}
        onClearDay={handleClearDay}
        onClearWeek={handleClearWeek}
        onAutocomplete={handleAutocompleteWeek}
        onSetGoal={handleActiveGoalChange}
        onCreateRecipe={handleAiRecipeGenerated}
      />

      <AutocompletePreferencesDialog
        isOpen={isPreferencesDialogOpen}
        onClose={() => setIsPreferencesDialogOpen(false)}
        onConfirm={handleRunAutocomplete}
        isLoading={isAutocompleting}
        hasGoal={!!activeGoalMacros}
      />

      <EmptyFridgeScanner
        isOpen={activePanel === 'empty-fridge'}
        onClose={() => handlePanelChange('empty-fridge', false)}
        onRecipeAction={handleRecipeAction}
        nutritionalGoal={activeGoalMacros || null}
        onSaveRecipe={handleSaveRecipe}
        isSavingRecipe={isSaving}
      />

      <RecipeImportDialog
        isOpen={activePanel === 'recipe-import'}
        onClose={() => handlePanelChange('recipe-import', false)}
        onRecipeImported={handleAiRecipeGenerated}
      />

      <ShoppingListSheet
        weekPlan={currentWeekPlan}
        isOpen={activePanel === 'shopping-list'}
        onOpenChange={(isOpen) => handlePanelChange('shopping-list', isOpen)}
        currentShoppingList={currentShoppingList}
        onListChange={handleShoppingListUpdate}
      />

      <FloatingGoals
        calorieResult={currentCalorieResult}
        onCalorieResultSave={handleCalorieResultSave}
        isOpen={activePanel === 'goals'}
        onOpenChange={(isOpen) => handlePanelChange('goals', isOpen)}
        onGoalSelect={handleActiveGoalChange}
        onSaveCustomGoal={handleSaveCustomGoal}
        activeGoal={activeGoal || null}
        dietPreference={currentDietPreference}
        onDietPreferenceChange={handleDietPreferenceChange}
      />

      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activePanel === 'sticky-note'}
        onOpenChange={(isOpen) => handlePanelChange('sticky-note', isOpen)}
      />

      {selectedMealForAddition && (
        <RecipeSelectionDialog
          isOpen={isRecipeSelectorOpen}
          onClose={() => setIsRecipeSelectorOpen(false)}
          meal={selectedMealForAddition}
          allRecipes={[...currentUserRecipes, ...nutriplannerRecipes]}
          onSave={handleRecipeSelectionSave}
        />
      )}
    </div>
  );
}

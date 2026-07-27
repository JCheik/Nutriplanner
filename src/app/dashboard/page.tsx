'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { RecipeSelectionDialog } from '@/components/nutri-planner/recipe-selection-dialog';
import { GuidedTour } from '@/components/nutri-planner/guided-tour';
import { AssistantDialog } from '@/components/nutri-planner/assistant-dialog';
import { RecipeImportDialog } from '@/components/nutri-planner/recipe-import-dialog';
import { WeekHistorySheet } from '@/components/nutri-planner/week-history-sheet';

export default function DashboardPage() {
  const {
    // Recipe state
    currentUserRecipes, nutriplannerRecipes, isSaving,
    handleSaveRecipe, handleDeleteRecipe, handleCopyRecipe,
    // Week plan state
    currentWeekPlan, dailyTotals,
    handleDrop, handleClearMeal, handleClearDay, handleClearWeek, handleRestoreWeek, handleRemoveRecipeFromMeal,
    handleUpdateMealTitle, handleUpdateMealTypes, handleAddMeal, handleDeleteMeal, handleUpdateServingsEaten,
    // Week history
    weekHistory,
    // User profile state (goals editing now lives in /dashboard/perfil)
    activeGoalMacros, currentShoppingList, currentDietPreference, nutriInterview,
    handleActiveGoalChange, handleShoppingListUpdate,
    // UI state
    dialogState, activePanel, activeDropTarget, setActiveDropTarget,
    isRecipeSelectorOpen, setIsRecipeSelectorOpen, selectedMealForAddition,
    isAutocompleting,
    // Handlers
    handleRecipeAction, handleDialogClose, handleAddToPlan,
    handleInternalSaveRecipe, handleInternalDeleteRecipe,
    handleMealSlotClick, handleRecipeSelectionSave,
    handlePanelOpen, handlePanelChange,
    handleAiRecipeGenerated, handleRecipeImported, handleAutocompleteWeek,
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
            onRecipeImportOpen={() => handlePanelOpen('recipe-import')}
            onShoppingListOpen={() => handlePanelOpen('shopping-list')}
            onHistoryOpen={() => handlePanelOpen('history')}
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

      {/* Tour guiado por Chefie (solo escritorio; móvil conserva WelcomeGuide) */}
      <GuidedTour />

      <AssistantDialog
        isOpen={activePanel === 'assistant'}
        onClose={() => handlePanelChange('assistant', false)}
        weekPlan={currentWeekPlan}
        userRecipes={currentUserRecipes}
        nutriplannerRecipes={nutriplannerRecipes}
        activeGoalMacros={activeGoalMacros || null}
        dietPreference={currentDietPreference}
        nutriInterview={nutriInterview}
        onDrop={handleDrop}
        onClearMeal={handleClearMeal}
        onClearDay={handleClearDay}
        onClearWeek={handleClearWeek}
        onAutocomplete={handleAutocompleteWeek}
        onSetGoal={handleActiveGoalChange}
        onCreateRecipe={handleAiRecipeGenerated}
      />

      <RecipeImportDialog
        isOpen={activePanel === 'recipe-import'}
        onClose={() => handlePanelChange('recipe-import', false)}
        onRecipeImported={handleRecipeImported}
      />

      <ShoppingListSheet
        weekPlan={currentWeekPlan}
        isOpen={activePanel === 'shopping-list'}
        onOpenChange={(isOpen) => handlePanelChange('shopping-list', isOpen)}
        currentShoppingList={currentShoppingList}
        onListChange={handleShoppingListUpdate}
      />

      {/* Goals moved to /dashboard/perfil (Mi perfil) — no floating panel here. */}
      <WeekHistorySheet
        isOpen={activePanel === 'history'}
        onOpenChange={(isOpen) => handlePanelChange('history', isOpen)}
        weekPlan={currentWeekPlan}
        history={weekHistory.history}
        isLoading={weekHistory.isLoading}
        onSave={weekHistory.saveCurrentWeek}
        onDelete={weekHistory.deleteSnapshot}
        onRestore={handleRestoreWeek}
      />

      {selectedMealForAddition && (
        <RecipeSelectionDialog
          isOpen={isRecipeSelectorOpen}
          onClose={() => setIsRecipeSelectorOpen(false)}
          meal={selectedMealForAddition}
          allRecipes={[...currentUserRecipes, ...nutriplannerRecipes]}
          onSave={handleRecipeSelectionSave}
          dietPreference={currentDietPreference}
        />
      )}
    </div>
  );
}

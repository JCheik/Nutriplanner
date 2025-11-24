'use client';

import { IngredientDatabaseManager } from '@/components/nutri-planner/ingredient-database-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { NewIngredientDialog } from '@/components/nutri-planner/new-ingredient-dialog';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { BaseIngredient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminIngredientsPage() {
    const [isNewOpen, setIsNewOpen] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);

    const handleSaveNewIngredient = (ingredientData: Partial<BaseIngredient>) => {
        if (!firestore || !user || !ingredientsCollectionRef) return;
        
        addDocumentNonBlocking(ingredientsCollectionRef, { ...ingredientData, createdBy: user.uid });
        toast({ title: "Ingrediente creado" });
        setIsNewOpen(false);
    };

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Base de Datos de Ingredientes</CardTitle>
                                    <CardDescription>
                                        Gestiona la colección global de <code className="bg-muted px-1 py-0.5 rounded">/ingredients</code>.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setIsNewOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nuevo Ingrediente
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <IngredientDatabaseManager />
                        </CardContent>
                    </Card>
                </div>
            </main>
             <NewIngredientDialog
                isOpen={isNewOpen}
                onClose={() => setIsNewOpen(false)}
                onSave={handleSaveNewIngredient}
            />
        </>
    );
}

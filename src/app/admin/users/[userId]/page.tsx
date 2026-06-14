'use client';
import { useEffect, use } from 'react';
import { useUser, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Cake, Mail, BookHeart, Wheat, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Recipe, BaseIngredient, UserProfile } from '@/lib/types';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { user: adminUser, claims, loading: adminLoading } = useUser();
    const firestore = useFirestore();
    const [dialogState, setDialogState] = useState<DialogState>({ open: false });

    // Memoize Firestore references
    const userProfileRef = useMemoFirebase(() => (firestore) ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const userRecipesRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'users', userId, 'recipes') : null, [firestore, userId]);
    const userIngredientsRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'users', userId, 'ingredients') : null, [firestore, userId]);

    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    const { data: userRecipes, isLoading: recipesLoading } = useCollection<Recipe>(userRecipesRef);
    const { data: userIngredients, isLoading: ingredientsLoading } = useCollection<BaseIngredient>(userIngredientsRef);

    const isLoading = adminLoading || profileLoading || recipesLoading || ingredientsLoading;

    if (isLoading) {
        return <div className="p-8">Cargando datos del usuario...</div>;
    }

    if (!userProfile) {
        return <div className="p-8">Usuario no encontrado.</div>;
    }

    const handleRecipeClick = (recipe: Recipe) => {
        setDialogState({ open: true, mode: 'view', recipe, isNutriPlannerRecipe: false });
    }

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <CardTitle>Detalles del Usuario</CardTitle>
                        <Button asChild variant="outline">
                            <Link href="/admin/users">Volver a la lista</Link>
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-start gap-6">
                                <Avatar className="h-20 w-20 border-2 border-primary">
                                    <AvatarImage src={userProfile.photoURL} />
                                    <AvatarFallback className="text-3xl">
                                        {userProfile.name?.charAt(0) || <User />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-bold font-headline">{userProfile.name}</h2>
                                    <CardDescription className="flex items-center gap-2 mt-2">
                                        <Mail className="h-4 w-4" /> {userProfile.email}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl"><BookHeart /> Recetas Creadas ({userRecipes?.length || 0})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {userRecipes && userRecipes.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {userRecipes.map(recipe => (
                                            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => handleRecipeClick(recipe)} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Este usuario no ha creado recetas.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl"><FileText /> Nota Adhesiva</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-yellow-100 p-4 rounded-md font-handwriting text-yellow-800 text-lg">
                                    {userProfile.stickyNote || 'Sin notas.'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <RecipeDialog dialogState={dialogState} onClose={() => setDialogState({ open: false })} />
        </>
    );
}

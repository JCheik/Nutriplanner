'use client';
import { useState, useEffect } from 'react';
import { listUsers, setUserAdmin, deleteUserAccount } from '@/lib/actions';
import { useUser } from '@/firebase';
import { SUPERUSER_EMAIL } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Trash2, User, UserCheck, UserX, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type ClientUserRecord = {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    disabled: boolean;
    creationTime: string;
    lastSignInTime: string;
    isAdmin: boolean;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<ClientUserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // El diálogo de borrado se controla por estado y se pinta UNA vez, fuera de
    // la tabla. Antes iba anidado dentro del DropdownMenu con AlertDialogTrigger:
    // los dos son modales de Radix y se peleaban por el foco, así que el clic en
    // "Sí, eliminar" no llegaba nunca al handler y parecía que no borraba nada.
    // Es el mismo patrón que /admin/ingredients, donde sí funcionaba.
    const [pendingDelete, setPendingDelete] = useState<ClientUserRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error('No autenticado.');
            const result = await listUsers(token);
            if (result.success && result.users) {
                setUsers(result.users);
            } else {
                setError(result.error || 'Ocurrió un error desconocido');
            }
        } catch (e: any) {
            setError(e.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSetAdmin = async (uid: string, isAdmin: boolean) => {
        const token = await user?.getIdToken();
        if (!token) {
            toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
            return;
        }
        // Optimistic update
        setUsers(users.map(u => u.uid === uid ? { ...u, isAdmin } : u));
        const result = await setUserAdmin(token, uid, isAdmin);
        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            fetchUsers(); // Re-fetch to ensure sync
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            fetchUsers(); // Revert optimistic update on failure
        }
    };

    const handleDeleteUser = async () => {
        const target = pendingDelete;
        if (!target || isDeleting) return;
        setIsDeleting(true);
        try {
            const token = await user?.getIdToken();
            if (!token) {
                toast({ variant: 'destructive', title: 'Error', description: 'No autenticado.' });
                return;
            }
            const result = await deleteUserAccount(token, target.uid);
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                setPendingDelete(null);
                fetchUsers(); // Refresh the user list
            } else {
                // El diálogo se queda abierto a propósito: si falla, el error se
                // lee sin haber perdido de vista a quién se estaba borrando.
                toast({ variant: 'destructive', title: 'No se pudo eliminar', description: result.error });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                 <div className="flex justify-between items-center">
                    <CardTitle>Administrar Usuarios</CardTitle>
                    <Button asChild variant="outline">
                        <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel</Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardDescription>Ver, editar roles y eliminar usuarios de la plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && <p>Cargando usuarios...</p>}
                        {error && <p className="text-destructive">Error: {error}</p>}
                        {!loading && !error && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Creado</TableHead>
                                        <TableHead>Último Acceso</TableHead>
                                        <TableHead className="text-center">Admin</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.uid}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={user.photoURL} />
                                                        <AvatarFallback>{user.displayName?.charAt(0) || <User />}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{user.displayName || 'Sin nombre'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{format(new Date(user.creationTime), 'P', { locale: es })}</TableCell>
                                            <TableCell>{format(new Date(user.lastSignInTime), 'Pp', { locale: es })}</TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={user.isAdmin}
                                                    onCheckedChange={(checked) => handleSetAdmin(user.uid, checked)}
                                                    aria-label="Hacer administrador"
                                                    disabled={user.email === SUPERUSER_EMAIL}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-glass">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/admin/users/${user.uid}`}>Ver Detalles</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleSetAdmin(user.uid, !user.isAdmin)} className="cursor-pointer" disabled={user.email === SUPERUSER_EMAIL}>
                                                            {user.isAdmin ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                                            {user.isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={() => setPendingDelete(user)} disabled={user.email === SUPERUSER_EMAIL}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar Usuario
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null); }}>
                <AlertDialogContent className="bg-glass">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a «{pendingDelete?.displayName || pendingDelete?.email}»?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se borra la cuenta y todos sus datos: recetas, plan, historial, diario y sus alimentos privados. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando…' : 'Sí, eliminar usuario'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}

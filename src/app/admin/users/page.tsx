'use client';
import { useState, useEffect } from 'react';
import { listUsers, setUserAdmin, deleteUserAccount } from '@/lib/actions';
import { UserRecord } from 'firebase-admin/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Trash2, User, UserCheck, UserX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type ClientUserRecord = Omit<UserRecord, 'metadata'> & {
    creationTime: string;
    lastSignInTime: string;
    isAdmin: boolean;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<ClientUserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        const result = await listUsers();
        if (result.success) {
            setUsers(result.users as ClientUserRecord[]);
        } else {
            setError(result.error || 'Ocurrió un error desconocido');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSetAdmin = async (uid: string, isAdmin: boolean) => {
        const result = await setUserAdmin(uid, isAdmin);
        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            fetchUsers(); // Refresh the user list
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const handleDeleteUser = async (uid: string) => {
        const result = await deleteUserAccount(uid);
        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            fetchUsers(); // Refresh the user list
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Administrar Usuarios</CardTitle>
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
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
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
                                                            <DropdownMenuItem onSelect={() => handleSetAdmin(user.uid, !user.isAdmin)} className="cursor-pointer">
                                                                {user.isAdmin ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                                                {user.isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Eliminar Usuario
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                     <AlertDialogContent className="bg-glass">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción es permanente y eliminará al usuario <span className="font-bold">{user.displayName || user.email}</span> y todos sus datos asociados (recetas, planes, etc.). No se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteUser(user.uid)}>
                                                                Sí, eliminar usuario
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

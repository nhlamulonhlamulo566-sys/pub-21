'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Loader2, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAction } from '@/app/actions/user-actions';
import Link from 'next/link';

export function UserList() {
  const firestore = useFirestore();
  const { user: currentUser, isUserLoading } = useUser();
  const { toast } = useToast();

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const usersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<UserProfile>(usersQuery);

  const handleDelete = async (userToDelete: UserProfile) => {
    if (!userToDelete || !currentUser) return;

    if (currentUser.uid === userToDelete.id) {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'You cannot delete your own account.',
      });
      return;
    }

    setDeletingUserId(userToDelete.id);

    try {
      const result = await deleteUserAction(userToDelete.id);

      if (result.success) {
        toast({
          title: 'User Deleted',
          description: `The account for "${userToDelete.email}" has been permanently removed.`,
        });
      } else {
        throw new Error(
          result.error || 'An unknown error occurred during deletion.'
        );
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message,
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'default';
      case 'sales':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const pageIsLoading = isLoadingUsers || isUserLoading;

  if (pageIsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{`${user.name} ${user.surname}`}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge
                  variant={getRoleVariant(user.role)}
                  className="capitalize"
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {user.createdAt
                  ? format(user.createdAt.toDate(), 'yyyy-MM-dd')
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/settings/users/edit/${user.id}`}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit user</span>
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(user)}
                  disabled={
                    !currentUser ||
                    currentUser.uid === user.id ||
                    deletingUserId === user.id
                  }
                  title={
                    currentUser?.uid === user.id
                      ? "You can't delete your own account"
                      : 'Delete user'
                  }
                >
                  {deletingUserId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Delete user</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

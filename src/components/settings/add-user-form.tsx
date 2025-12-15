
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useFirestore,
  setDocumentNonBlocking,
  useDoc,
  useUser,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { createUserAction } from '@/app/actions/user-actions';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemoFirebase } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

const formSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters'),
    role: z.enum(['administrator', 'sales']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof formSchema>;

export function AddUserForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const router = useRouter();
  const { user: currentUser } = useUser();

  const userProfileRef = useMemoFirebase(
    () =>
      firestore && currentUser
        ? doc(firestore, 'users', currentUser.uid)
        : null,
    [firestore, currentUser]
  );
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);
  const isCurrentUserAdmin = currentUserProfile?.role === 'administrator';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'sales',
    },
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      if (!firestore) {
        throw new Error('Firestore is not initialized.');
      }

      // 1. Create user in Auth via Server Action
      const result = await createUserAction({
        email: data.email,
        password: data.password,
      });

      if (!result.success || !result.uid) {
        throw new Error(result.error || 'Failed to create user in Auth.');
      }

      const uid = result.uid;

      // 2. Create user profile document in Firestore
      const userDocRef = doc(firestore, 'users', uid);
      setDocumentNonBlocking(
        userDocRef,
        {
          email: data.email,
          role: data.role,
          createdAt: new Date(),
        },
        {}
      );

      // 3. Grant admin role if selected
      if (data.role === 'administrator') {
        const adminRoleDocRef = doc(firestore, 'roles_admin', uid);
        setDocumentNonBlocking(adminRoleDocRef, {}, {});
      }

      toast({
        title: 'User Created!',
        description: `Account for ${data.email} has been created with the role: ${data.role}.`,
      });
      form.reset(); // Reset form fields to allow adding another user
    } catch (error: any) {
      console.error('User creation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New User Details</CardTitle>
        <CardDescription>
          Enter the details for the new user account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="new.user@example.com"
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      {isCurrentUserAdmin && (
                        <SelectItem value="administrator">
                          Administrator
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push('/settings/users')}
              >
                Done
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

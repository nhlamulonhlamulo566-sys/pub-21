'use client';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import {
  useCollection,
  useFirestore,
  deleteDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);
  const { toast } = useToast();

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete && firestore && user) {
      const productRef = doc(firestore, 'products', productToDelete.id);
      deleteDocumentNonBlocking(productRef);
      toast({
        title: 'Product Deleted',
        description: `"${productToDelete.name}" has been removed from the live database.`,
      });
      setProductToDelete(null);
    } else {
       toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to delete a product.',
      });
    }
  };

  const pageIsLoading = isLoading || isUserLoading;

  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Product Catalog</h1>
          <Button asChild>
            <Link href="/products/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
        {pageIsLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-0">
                  <Skeleton className="aspect-video w-full rounded-t-lg" />
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter className='gap-2'>
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products?.map((product) => {
            const placeholder = PlaceHolderImages.find(
              (p) => p.id === product.imageId
            );
            return (
              <Card key={product.id} className="flex flex-col">
                <CardHeader className="p-0">
                  {product.imageUrl ? (
                    <Image
                      alt={product.name}
                      className="aspect-video w-full rounded-t-lg object-cover"
                      height={300}
                      src={product.imageUrl}
                      width={400}
                    />
                  ) : placeholder ? (
                    <Image
                      alt={product.name}
                      className="aspect-video w-full rounded-t-lg object-cover"
                      height={300}
                      src={placeholder.imageUrl}
                      width={400}
                      data-ai-hint={placeholder.imageHint}
                    />
                  ) : (
                    <Skeleton className="aspect-video w-full rounded-t-lg" />
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-2 p-4">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <Badge variant="outline">{product.category}</Badge>
                    <span className="font-mono">{product.sku}</span>
                  </div>
                  <CardDescription>{product.description}</CardDescription>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                   <Button variant="outline" size="icon" asChild>
                    <Link href={`/products/edit/${product.id}`}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit {product.name}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteClick(product)}
                    disabled={!user}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete {product.name}</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product "{productToDelete?.name}" from your live database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

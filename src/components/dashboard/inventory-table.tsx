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
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (status: Product['status']) => {
  switch (status) {
    case 'In Stock':
      return 'default';
    case 'Low Stock':
      return 'secondary'; // Will be styled with accent color
    case 'Out of Stock':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusClassName = (status: Product['status']) => {
  switch (status) {
    case 'Low Stock':
      return 'bg-accent text-accent-foreground hover:bg-accent/80';
    default:
      return '';
  }
};

interface InventoryTableProps {
  products: Product[] | null;
  isLoading: boolean;
}

export function InventoryTable({ products, isLoading }: InventoryTableProps) {
  const inventoryItems = products;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden w-[100px] sm:table-cell">
            <span className="sr-only">Image</span>
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inventoryItems?.map((item) => {
          const placeholder = PlaceHolderImages.find(
            (p) => p.id === item.imageId
          );
          return (
            <TableRow key={item.id}>
              <TableCell className="hidden sm:table-cell">
                {item.imageUrl ? (
                  <Image
                    alt={item.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={item.imageUrl}
                    width="64"
                  />
                ) : placeholder ? (
                  <Image
                    alt={item.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={placeholder.imageUrl}
                    width="64"
                    data-ai-hint={placeholder.imageHint}
                  />
                ) : (
                  <Skeleton className="aspect-square h-16 w-16 rounded-md" />
                )}
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.sku}</TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(item.status)}
                  className={getStatusClassName(item.status)}
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{item.stock}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

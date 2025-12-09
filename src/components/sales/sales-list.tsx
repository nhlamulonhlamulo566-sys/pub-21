'use client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Sale, SaleItem } from '@/lib/types';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

function SaleDetails({ sale }: { sale: Sale }) {
  const firestore = useFirestore();
  const itemsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `sales/${sale.id}/items`))
        : null,
    [firestore, sale.id]
  );
  const { data: items, isLoading } = useCollection<SaleItem>(itemsQuery);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-muted/50 rounded-md space-y-4">
       {(!items || items.length === 0) ? (
         <p className="p-4 text-muted-foreground">No items found for this sale.</p>
       ) : (
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {items.map((item) => (
                <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">R{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">R{(item.quantity * item.price).toFixed(2)}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
       )}
      <Separator />
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm p-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">R{sale.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount Paid</span>
          <span className="font-medium">R{sale.amountPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
           <span className="font-medium">R{sale.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Change Due</span>
          <span className="font-medium">R{sale.changeDue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
           <span className="text-muted-foreground">Payment Method</span>
           <Badge variant="secondary" className="capitalize">{sale.paymentMethod}</Badge>
        </div>
        <div/>
         <div className="flex justify-between col-span-2 pt-2 border-t mt-2">
          <span className="font-bold">Total</span>
          <span className="font-bold">R{sale.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function SalesList() {
  const firestore = useFirestore();
  const salesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'sales'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales History</CardTitle>
        <CardDescription>
          A log of all completed transactions. Click a sale to view its items.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSales ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
             <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full text-sm font-semibold px-4 py-2 border-b">
              <div>Date</div>
              <div>Salesperson</div>
              <div className="text-right">Total</div>
              <div className="hidden md:block text-right">Items</div>
            </div>
            {sales?.map((sale) => {
              const saleItemsQuery = query(collection(firestore, `sales/${sale.id}/items`));
              // Note: This is not ideal for performance as it creates a subscription for each sale.
              // For a large number of sales, consider fetching item counts differently.
              const { data: items } = useCollection(useMemoFirebase(() => saleItemsQuery, [sale.id]));
              const itemCount = items?.length ?? 0;

              return (
              <AccordionItem value={sale.id} key={sale.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full text-sm text-left">
                     <div className="font-medium">
                      {sale.createdAt
                        ? format(sale.createdAt.toDate(), 'yyyy-MM-dd HH:mm')
                        : 'N/A'}
                    </div>
                    <div className="text-muted-foreground">{sale.salespersonName}</div>
                    <div className="text-right font-semibold">
                      R{sale.total.toFixed(2)}
                    </div>
                     <div className="hidden md:block text-right text-muted-foreground">
                      {itemCount} item(s)
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <SaleDetails sale={sale} />
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

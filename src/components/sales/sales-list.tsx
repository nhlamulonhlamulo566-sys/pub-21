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
import { useCollection, useDoc, useFirestore, useUser, useAuth } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, doc, limit } from 'firebase/firestore';
import type { Sale, SaleItem, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Ban, Loader2, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { voidSaleAction } from '@/app/actions/sale-actions';

function SaleDetails({ sale, isAdmin }: { sale: Sale; isAdmin: boolean }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isVoiding, setIsVoiding] = useState(false);
  const itemsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `sales/${sale.id}/items`))
        : null,
    [firestore, sale.id]
  );
  const { data: items, isLoading } = useCollection<SaleItem>(itemsQuery);

  const handleVoidSale = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVoiding(true);

    if (!auth || !auth.currentUser) {
       toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
      });
      setIsVoiding(false);
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsVoiding(false);
      return;
    }

    const idToken = await currentUser.getIdToken();

    const result = await voidSaleAction({ saleId: sale.id, idToken });
    setIsVoiding(false);

    if (result?.success) {
      toast({
        title: 'Sale Voided',
        description: `Sale ${sale.id.substring(
          0,
          7
        )} has been successfully voided.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Void Failed',
        description: result?.error || 'An unknown error occurred.',
      });
    }
  };

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
      {!items || items.length === 0 ? (
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
                <TableCell className="text-right">
                  R{item.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  R{(item.quantity * item.price).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm p-2">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">R{sale.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">R{sale.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t mt-2">
            <span className="font-bold">Total</span>
            <span className="font-bold">R{sale.total.toFixed(2)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium">R{sale.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Change Due</span>
            <span className="font-medium">R{sale.changeDue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <Badge variant="secondary" className="capitalize">
              {sale.paymentMethod}
            </Badge>
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="p-2 border-t mt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleVoidSale}
            disabled={sale.status === 'voided' || isVoiding}
          >
            {isVoiding ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ban className="mr-2 h-3.5 w-3.5" />
            )}
            Void This Sale
          </Button>
        </div>
      )}
    </div>
  );
}

function SaleAccordionItem({ sale, isAdmin }: { sale: Sale, isAdmin: boolean }) {
  const firestore = useFirestore();
  
  const saleItemsQuery = useMemoFirebase(() => (
      firestore ? query(collection(firestore, `sales/${sale.id}/items`)) : null
  ), [firestore, sale.id]);
  
  const { data: items } = useCollection(saleItemsQuery);
  const itemCount = items?.length ?? 0;

  return (
    <AccordionItem value={sale.id} key={sale.id}>
      <AccordionTrigger className="hover:no-underline p-4">
        <div className="grid grid-cols-4 md:grid-cols-5 gap-4 w-full text-sm text-left">
          <div className="font-medium">
            {sale.createdAt
              ? format(sale.createdAt.toDate(), 'yyyy-MM-dd HH:mm')
              : 'N/A'}
          </div>
          <div className="text-muted-foreground">{sale.salespersonName}</div>
          <div className="font-semibold text-right">
            R{sale.total.toFixed(2)}
          </div>
          <div className="hidden md:block text-right text-muted-foreground">
            {itemCount} item(s)
          </div>
           <div className="flex justify-end">
            {sale.status === 'voided' && (
              <Badge variant="destructive">Voided</Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <SaleDetails sale={sale} isAdmin={isAdmin} />
      </AccordionContent>
    </AccordionItem>
  );
}

export function SalesList() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  const salesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'sales'), orderBy('createdAt', 'desc'), limit(50))
        : null,
    [firestore]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = userProfile?.role === 'administrator';
  const isLoading = isLoadingSales || isProfileLoading;
  
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!searchTerm) return sales;
    return sales.filter(sale => sale.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sales, searchTerm]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales History</CardTitle>
        <CardDescription>
          A log of all completed transactions. Click a sale to view its items.
        </CardDescription>
         <div className="relative pt-2">
            <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by Sale ID..."
                className="pl-8 w-full md:w-1/3 lg:w-1/4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
            />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
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
             <div className="grid grid-cols-4 md:grid-cols-5 gap-4 w-full text-sm font-semibold px-4 py-2 border-b">
              <div>Date</div>
              <div>Salesperson</div>
              <div className="text-right">Total</div>
              <div className="hidden md:block text-right">Items</div>
              <div className="text-right">Status</div>
            </div>
            {filteredSales.map((sale) => (
              <SaleAccordionItem key={sale.id} sale={sale} isAdmin={isAdmin}/>
            ))}
            {filteredSales.length === 0 && !isLoading && (
              <div className="text-center p-8 text-muted-foreground">
                {searchTerm ? `No sales found for ID "${searchTerm}"` : "No sales have been recorded yet."}
              </div>
            )}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

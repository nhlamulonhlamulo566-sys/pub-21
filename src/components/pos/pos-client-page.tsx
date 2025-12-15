'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import {
  collection,
  query,
  doc,
  runTransaction,
  Timestamp,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Product, Sale } from '@/lib/types';
import { PosProductList } from './pos-product-list';
import { PosCart } from './pos-cart';
import { useToast } from '@/hooks/use-toast';
import { Barcode, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { useReactToPrint } from 'react-to-print';
import { SaleReceipt } from './sale-receipt';
import { Button } from '../ui/button';

export type CartItem = {
  product: Product;
  quantity: number;
  price: number;
};

type CompletedSale = {
  details: Sale;
  items: CartItem[];
};

export function PosClientPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [scannedSku, setScannedSku] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: useCallback(() => receiptRef.current, []),
  });


  const addToCart = useCallback(
    (product: Product, price: number) => {
      setCart((currentCart) => {
        const existingItem = currentCart.find(
          (item) => item.product.id === product.id
        );
        if (existingItem) {
          if (existingItem.quantity < product.stock) {
            return currentCart.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            toast({
              variant: 'destructive',
              title: 'Out of Stock',
              description: `No more stock available for ${product.name}.`,
            });
            return currentCart;
          }
        }
        if (product.stock > 0) {
          return [...currentCart, { product, quantity: 1, price: price || 0 }];
        } else {
          toast({
            variant: 'destructive',
            title: 'Out of Stock',
            description: `${product.name} is currently out of stock.`,
          });
          return currentCart;
        }
      });
    },
    [toast]
  );

  const processScan = useCallback(
    (sku: string) => {
      if (!sku || !products) return;

      const product = products.find((p) => p.sku === sku);
      if (product) {
        addToCart(product, product.price || 0);
      } else {
        toast({
          variant: 'destructive',
          title: 'Product not found',
          description: `No product with SKU "${sku}" was found.`,
        });
      }
      setScannedSku(''); // Clear the input field's state
    },
    [products, addToCart, toast]
  );

  useEffect(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    if (scannedSku) {
      scanTimeoutRef.current = setTimeout(() => {
        processScan(scannedSku);
      }, 100); // Wait 100ms after the last keystroke to process
    }
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [scannedSku, processScan]);

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId)
    );
  };

  const handleCancelSale = () => {
    if (cart.length > 0) {
      setIsCancelling(true);
    }
  };

  const handleClearCart = () => {
    setCart([]);
    setIsCancelling(false);
    toast({
      title: 'Cart Cleared',
      description: 'The current sale has been cancelled.',
    });
  };

  const completeSale = async (
    saleDetails: Omit<
      Sale,
      'id' | 'createdAt' | 'salespersonId' | 'salespersonName'
    >
  ) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not connected or user not logged in.',
      });
      return;
    }
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cart is empty',
        description: 'Add items to the cart to complete a sale.',
      });
      return;
    }

    setIsProcessingSale(true);

    let saleId = '';

    try {
      // Pre-fetch all product documents that need updates
      const baseUnitsToUpdate: Record<string, number> = {};
      const allLinkedProductSKUs = new Set<string>();

      cart.forEach(item => {
        const baseSku = item.product.baseProductSku || item.product.sku;
        const unitsSold = (item.product.containedUnits || 1) * item.quantity;
        baseUnitsToUpdate[baseSku] = (baseUnitsToUpdate[baseSku] || 0) + unitsSold;
        allLinkedProductSKUs.add(baseSku);
      });

      // Fetch all necessary product data outside the transaction
      const productsToUpdateSnap = await getDocs(
        query(collection(firestore, 'products'), where('baseProductSku', 'in', Array.from(allLinkedProductSKUs)))
      );
      const allProductsData: Record<string, Product[]> = {};
      productsToUpdateSnap.docs.forEach(doc => {
          const product = { ...doc.data(), id: doc.id } as Product;
          const baseSku = product.baseProductSku;
          if (baseSku) {
              if (!allProductsData[baseSku]) {
                  allProductsData[baseSku] = [];
              }
              allProductsData[baseSku].push(product);
          }
      });

      let finalSaleData: Sale | null = null;
      await runTransaction(firestore, async (transaction) => {
        const saleTimestamp = Timestamp.now();
        const newSaleRef = doc(collection(firestore, 'sales'));
        saleId = newSaleRef.id;

        // Process updates for each base SKU
        for (const baseSku in baseUnitsToUpdate) {
          const totalUnitsToRemove = baseUnitsToUpdate[baseSku];
          let linkedProducts = allProductsData[baseSku];

          if (!linkedProducts || linkedProducts.length === 0) {
              const mainProduct = products?.find(p => p.sku === baseSku);
              if (mainProduct) {
                  // Initialize the array if it was undefined
                  linkedProducts = [mainProduct];
              } else {
                 throw new Error(`Base product with SKU ${baseSku} not found.`);
              }
          }

          // Find the base product to get the current total stock
          const baseProduct = linkedProducts.find(p => p.sku === baseSku);
          if (!baseProduct) {
              throw new Error(`Base product definition missing for SKU ${baseSku}.`);
          }
          const currentTotalStock = baseProduct.stock;

          if (totalUnitsToRemove > currentTotalStock) {
              throw new Error(`Not enough stock for products with base SKU ${baseSku}.`);
          }
          
          const newTotalStock = currentTotalStock - totalUnitsToRemove;

          // Update all linked products
          for (const productToUpdate of linkedProducts) {
              const productRef = doc(firestore, 'products', productToUpdate.id);
              const newStockForProduct = Math.floor(newTotalStock / (productToUpdate.containedUnits || 1));
              
              const newStatus =
                  newStockForProduct > (productToUpdate.threshold || 0)
                    ? 'In Stock'
                    : newStockForProduct > 0
                    ? 'Low Stock'
                    : 'Out of Stock';

              transaction.update(productRef, {
                  stock: newStockForProduct,
                  status: newStatus,
              });
          }
        }
        
        const saleData = {
          ...saleDetails,
          id: newSaleRef.id,
          createdAt: saleTimestamp,
          salespersonId: user.uid,
          salespersonName: user.displayName || user.email,
        };
        // Record the sale
        transaction.set(newSaleRef, saleData);
        finalSaleData = saleData;

        // Record sale items
        for (const item of cart) {
          const saleItemRef = doc(
            collection(firestore, `sales/${newSaleRef.id}/items`)
          );
          transaction.set(saleItemRef, {
            saleId: newSaleRef.id,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
            createdAt: saleTimestamp,
          });
        }
      });
      if (finalSaleData) {
        setLastCompletedSale({ details: finalSaleData, items: cart });
      }

      toast({
        title: 'Sale Complete!',
        description: 'The inventory has been updated and the sale has been recorded.',
        action: <Button variant="outline" size="sm" onClick={handlePrint}>Print Receipt</Button>
      });

      setCart([]);
    } catch (error: any) {
      console.error('Sale failed:', error);
      toast({
        variant: 'destructive',
        title: 'Sale Failed',
        description:
          error.message || 'An unknown error occurred during the sale.',
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold md:text-2xl">Point of Sale</h1>
          <div className='flex items-center gap-2'>
            <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!lastCompletedSale}
                >
                <Printer className="mr-2 h-4 w-4" />
                Print Last Receipt
            </Button>
            <div className="relative w-full max-w-sm">
                <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                ref={scanInputRef}
                placeholder="Scan SKU..."
                className="pl-8"
                value={scannedSku}
                onChange={(e) => setScannedSku(e.target.value)}
                disabled={isLoading}
                autoFocus
                />
            </div>
          </div>
        </div>
        <div className="grid min-h-[calc(100vh-10rem)] gap-4 lg:grid-cols-[1fr_450px]">
          <PosProductList
            products={products}
            isLoading={isLoading}
            onAddToCart={addToCart}
          />
          <PosCart
            cart={cart}
            onUpdateCartItem={updateCartItem}
            onRemoveFromCart={removeFromCart}
            onCompleteSale={completeSale}
            isProcessingSale={isProcessingSale}
            onCancelSale={handleCancelSale}
          />
        </div>
      </div>
      <AlertDialog
        open={isCancelling}
        onOpenChange={setIsCancelling}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will clear all items from the current cart. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart}>
              Yes, Cancel Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="hidden">
        {lastCompletedSale && (
          <SaleReceipt
            ref={receiptRef}
            sale={lastCompletedSale.details}
            items={lastCompletedSale.items}
          />
        )}
      </div>
    </>
  );
}

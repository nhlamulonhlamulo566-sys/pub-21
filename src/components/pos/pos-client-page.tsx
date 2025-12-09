'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import {
  collection,
  query,
  doc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Product, Sale } from '@/lib/types';
import { PosProductList } from './pos-product-list';
import { PosCart } from './pos-cart';
import { useToast } from '@/hooks/use-toast';
import { Barcode } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type CartItem = {
  product: Product;
  quantity: number;
  price: number;
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
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

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

  const completeSale = async (saleDetails: Omit<Sale, 'id' | 'createdAt' | 'salespersonId' | 'salespersonName'>) => {
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

    try {
      await runTransaction(firestore, async (transaction) => {
        const productRefs = cart.map(item => doc(firestore, 'products', item.product.id));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // --- All reads are now complete ---

        const newSaleRef = doc(collection(firestore, 'sales'));

        // --- All writes start here ---

        // 1. Create Sale Record
        transaction.set(newSaleRef, {
          ...saleDetails,
          createdAt: Timestamp.now(),
          salespersonId: user.uid,
          salespersonName: user.displayName || user.email,
        });

        // 2. Create SaleItem Records and Update Inventory
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i];
          const productDoc = productDocs[i];

          if (!productDoc.exists()) {
            throw new Error(`Product ${item.product.name} not found.`);
          }

          const currentStock = productDoc.data().stock;
          if (item.quantity > currentStock) {
            throw new Error(
              `Not enough stock for ${item.product.name}. Only ${currentStock} available.`
            );
          }

          const saleItemRef = doc(collection(firestore, `sales/${newSaleRef.id}/items`));
          transaction.set(saleItemRef, {
            saleId: newSaleRef.id,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
          });

          const newStock = currentStock - item.quantity;
          const newStatus =
            newStock > (productDoc.data().threshold || 0)
              ? 'In Stock'
              : newStock > 0
              ? 'Low Stock'
              : 'Out of Stock';

          transaction.update(productRefs[i], { stock: newStock, status: newStatus });
        }
      });

      toast({
        title: 'Sale Complete!',
        description:
          'The inventory has been updated and the sale has been recorded.',
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Point of Sale</h1>
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
        />
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2 } from 'lucide-react';
import type { CartItem } from './pos-client-page';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PosCartProps {
  cart: CartItem[];
  onUpdateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (productId: string) => void;
  onCompleteSale: (saleDetails: {
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    changeDue: number;
    paymentMethod: 'cash' | 'card';
  }) => void;
  isProcessingSale: boolean;
}

export function PosCart({
  cart,
  onUpdateCartItem,
  onRemoveFromCart,
  onCompleteSale,
  isProcessingSale,
}: PosCartProps) {
  const [amountPaid, setAmountPaid] = useState(0);
  const [taxRate, setTaxRate] = useState(0.15); // Default to 15%
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const { toast } = useToast();

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const changeDue = amountPaid > 0 ? amountPaid - total : 0;

  useEffect(() => {
    if (paymentMethod === 'card') {
      setAmountPaid(total);
    }
  }, [total, paymentMethod]);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity > item.product.stock) {
      toast({
        variant: 'destructive',
        title: 'Not Enough Stock',
        description: `Only ${item.product.stock} units of ${item.product.name} are available.`,
      });
      onUpdateCartItem(item.product.id, { quantity: item.product.stock });
    } else {
      onUpdateCartItem(item.product.id, { quantity: newQuantity });
    }
  };


  const handleCompleteSale = () => {
    if (amountPaid < total) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Payment',
        description: `The amount paid (R${amountPaid.toFixed(
          2
        )}) is less than the total (R${total.toFixed(2)}).`,
      });
      return;
    }
    const saleDetails = { subtotal, tax, total, amountPaid, changeDue, paymentMethod };
    onCompleteSale(saleDetails);
    setAmountPaid(0);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Cart</CardTitle>
        <CardDescription>
          Items will appear here when added from the product list.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_auto] items-center gap-4 px-6 pb-2 text-sm font-medium text-muted-foreground border-b">
              <div>Description</div>
              <div className="text-left">Unit Price</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Total</div>
              <div className="w-8"></div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-6">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_auto] items-start gap-4 text-sm"
                  >
                    {/* Description */}
                    <p className="font-medium">{item.product.name}</p>

                    {/* Unit Price */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">R</span>
                        <Input
                          type="number"
                          value={item.price.toFixed(2)}
                          onChange={(e) =>
                            onUpdateCartItem(item.product.id, {
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-24"
                        />
                      </div>

                    {/* Quantity */}
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-center mx-auto"
                      min="1"
                      max={item.product.stock}
                    />

                    {/* Total Price */}
                    <p className="font-medium text-right leading-loose">
                      R{(item.price * item.quantity).toFixed(2)}
                    </p>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 p-6 bg-muted/40">
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Taxes</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={Math.round(taxRate * 100)}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
                className="h-8 w-16 text-right"
              />
               <span className="text-muted-foreground">%</span>
            </div>
            <span>R{tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>R{total.toFixed(2)}</span>
          </div>
        </div>
        <div className="w-full space-y-4">
            <RadioGroup
              defaultValue="cash"
              onValueChange={(value: 'cash' | 'card') => setPaymentMethod(value)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                <Label
                  htmlFor="cash"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Cash
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="card"
                  id="card"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Card
                </Label>
              </div>
            </RadioGroup>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="amount-paid" className="text-sm font-medium">
                Amount Paid
              </label>
              <Input
                id="amount-paid"
                type="number"
                placeholder="R0.00"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="text-right"
                disabled={paymentMethod === 'card'}
              />
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-medium">Change Due</p>
              <p className="text-2xl font-bold">R{changeDue >= 0 ? changeDue.toFixed(2) : '0.00'}</p>
            </div>
          </div>
        </div>
        <Button
          className="w-full"
          onClick={handleCompleteSale}
          disabled={
            cart.length === 0 ||
            isProcessingSale ||
            (total > 0 && amountPaid < total)
          }
        >
          {isProcessingSale && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Complete Sale
        </Button>
      </CardFooter>
    </Card>
  );
}

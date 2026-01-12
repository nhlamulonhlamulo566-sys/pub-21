'use client';

import React from 'react';
import type { Sale } from '@/lib/types';
import type { CartItem } from './pos-client-page';
import { format } from 'date-fns';

interface SaleReceiptProps {
  sale: Sale;
  items: CartItem[];
}

export const SaleReceipt = React.forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ sale, items }, ref) => {
    if (!sale) {
      return <div ref={ref} />;
    }
    return (
      <div ref={ref} className="p-8 font-mono text-sm bg-white text-black">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold uppercase">Lynross liquor store</h1>
          <p>Erf 1/111 Rosslyn x01 (Piet Rautenbach Street)</p>
          <p>(012) 824-0070</p>
          <p className="pt-2">
            {sale.createdAt
              ? format(sale.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss')
              : ''}
          </p>
          <p>Sale ID: {sale.id.substring(0, 8)}</p>
          <p>Cashier: {sale.salespersonName}</p>
        </div>

        <div className="space-y-2 border-t border-b border-dashed border-black py-4 mb-4">
          {items.map((item) => (
            <div key={item.product.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-1">{item.quantity}x</div>
              <div className="col-span-7 truncate">{item.product.name}</div>
              <div className="col-span-4 text-right">
                R{(item.quantity * item.price).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{sale.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>R{sale.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-black pt-2 mt-2">
            <span>Total</span>
            <span>R{sale.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-dashed border-black mt-4 pt-4">
          <div className="flex justify-between">
            <span>{sale.paymentMethod === 'cash' ? 'Cash Paid' : 'Card Paid'}</span>
            <span>R{sale.amountPaid.toFixed(2)}</span>
          </div>
          {sale.paymentMethod === 'cash' && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>R{sale.changeDue.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="text-center mt-8 pt-4 border-t border-dashed border-black">
            <p className="font-semibold">Thank you for your purchase!</p>
        </div>
      </div>
    );
  }
);
SaleReceipt.displayName = 'SaleReceipt';

'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Sale } from '@/lib/types';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { voidSaleAction } from '@/app/actions/sale-actions';

interface VoidSaleDialogProps {
  sale: Sale;
  onClose: () => void;
}

export function VoidSaleDialog({ sale, onClose }: VoidSaleDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleVoidSale = async () => {
    if (!user?.email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in as an administrator.',
      });
      return;
    }
    
    setIsLoading(true);

    const result = await voidSaleAction({
        saleId: sale.id,
        adminEmail: user.email,
    });
    
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Sale Voided',
        description: `Sale ${sale.id.substring(0, 7)} has been successfully voided.`,
      });
      onClose();
    } else {
      toast({
        variant: 'destructive',
        title: 'Void Failed',
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Void Sale Confirmation</DialogTitle>
          <DialogDescription>
            This will mark the sale as void and return the items to stock. This action cannot be undone. Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleVoidSale} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Sale, UserProfile } from '@/lib/types';
import { startOfToday, startOfWeek, startOfMonth, endOfToday, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';
import { Loader2, User, Ban, Undo2, Users } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface PaymentStats {
  cash: number;
  card: number;
  voids: number;
  returns: number;
  total: number;
}

interface PeriodTotals {
  today: PaymentStats;
  thisWeek: PaymentStats;
  thisMonth: PaymentStats;
}

type SalespersonTotals = Record<string, PeriodTotals>;

const emptyStats: PaymentStats = { cash: 0, card: 0, voids: 0, returns: 0, total: 0 };
const emptyPeriodTotals: PeriodTotals = {
  today: { ...emptyStats },
  thisWeek: { ...emptyStats },
  thisMonth: { ...emptyStats },
};

const StatDisplay = ({ title, amount }: { title: string; amount: number }) => (
  <div className="flex justify-between items-center text-sm">
    <p className="text-muted-foreground">{title}</p>
    <p className="font-medium">R{amount.toFixed(2)}</p>
  </div>
);

const PaymentMethodCard = ({ title, amount }: { title: string; amount: number }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">R{amount.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">Amount for this period</p>
    </CardContent>
  </Card>
);

const AdjustmentCard = ({ title, amount, icon: Icon }: { title: string; amount: number; icon: React.ElementType }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">R{amount.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">Total value for this period</p>
    </CardContent>
  </Card>
);

const PeriodSection = ({ title, stats }: { title: string; stats: PaymentStats }) => (
  <div>
    <h3 className="mb-4 text-xl font-semibold tracking-tight">{title}</h3>
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <PaymentMethodCard title="Cash Only" amount={stats.cash} />
      <PaymentMethodCard title="Card Only" amount={stats.card} />
      <div className="grid gap-4">
        <AdjustmentCard title="Voids" amount={stats.voids} icon={Ban} />
        <AdjustmentCard title="Returns" amount={stats.returns} icon={Undo2} />
      </div>
    </div>
  </div>
);

export default function CashUpPage() {
  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => query(collection(firestore, 'sales')), [firestore]);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const salespersonTotals: SalespersonTotals = useMemo(() => {
    const initialData: SalespersonTotals = {};
    
    if (users) {
      users.forEach(user => {
        const name = `${user.name} ${user.surname}`;
        initialData[name] = JSON.parse(JSON.stringify(emptyPeriodTotals));
      });
    }

    if (!sales) return initialData;

    const now = new Date();
    const todayInterval = { start: startOfToday(), end: endOfToday() };
    const weekInterval = { start: startOfWeek(now), end: endOfWeek(now) };
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

    return sales.reduce((acc, sale) => {
      const salespersonName = sale.salespersonName || sale.salespersonId || 'Unknown';
      if (!acc[salespersonName]) {
        acc[salespersonName] = JSON.parse(JSON.stringify(emptyPeriodTotals));
      }

      // Normalize createdAt to JS Date
      let saleDate: Date;
      if (!sale.createdAt) {
        saleDate = new Date();
      } else if (sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else {
        saleDate = new Date(sale.createdAt);
      }
      
      const processSale = (period: keyof PeriodTotals, interval: { start: Date; end: Date }) => {
        if (isWithinInterval(saleDate, interval)) {
          if (sale.status === 'voided') {
            acc[salespersonName][period].voids += sale.total || 0;
            return;
          }

          if (sale.status === 'completed') {
            if (sale.paymentMethod === 'cash') {
              acc[salespersonName][period].cash += sale.total || 0;
            } else if (sale.paymentMethod === 'card') {
              acc[salespersonName][period].card += sale.total || 0;
            }
            acc[salespersonName][period].total += sale.total || 0;
          }
        }
      };

      processSale('today', todayInterval);
      processSale('thisWeek', weekInterval);
      processSale('thisMonth', monthInterval);
      
      return acc;
    }, initialData);

  }, [sales, users]);
  
  const grandTotals: PeriodTotals = useMemo(() => {
    const totals = JSON.parse(JSON.stringify(emptyPeriodTotals));
    Object.values(salespersonTotals).forEach(personTotals => {
        Object.keys(totals).forEach(period => {
            const p = period as keyof PeriodTotals;
            totals[p].cash += personTotals[p].cash;
            totals[p].card += personTotals[p].card;
            totals[p].voids += personTotals[p].voids;
            totals[p].returns += personTotals[p].returns;
            totals[p].total += personTotals[p].total;
        });
    });
    return totals;
  }, [salespersonTotals]);

  const isLoading = salesLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const sortedSalespersons = Object.keys(salespersonTotals).sort();

  return (
    <>
      <PageHeader title="Cash-Up Summary" />
      <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Per-Salesperson Breakdown</h2>
            <Accordion type="multiple" className="w-full space-y-4">
            {sortedSalespersons.map(salesperson => (
              <AccordionItem value={salesperson} key={salesperson} className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">{salesperson}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0 space-y-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Salesperson:</p>
                    <h3 className="text-xl font-bold">{salesperson}</h3>
                  </div>

                  <PeriodSection title="Today's Summary" stats={salespersonTotals[salesperson].today} />
                  <Separator />
                  <PeriodSection title="This Week's Summary" stats={salespersonTotals[salesperson].thisWeek} />
                  <Separator />
                  <PeriodSection title="This Month's Summary" stats={salespersonTotals[salesperson].thisMonth} />
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
        </div>

        <Separator />

        <Card className="bg-muted/40">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <span className="text-2xl">Grand Totals (All Salespersons)</span>
                </CardTitle>
                <CardDescription>A combined summary of all sales activity across all staff members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <PeriodSection title="Today's Grand Total" stats={grandTotals.today} />
                <Separator />
                <PeriodSection title="This Week's Grand Total" stats={grandTotals.thisWeek} />
                <Separator />
                <PeriodSection title="This Month's Grand Total" stats={grandTotals.thisMonth} />
            </CardContent>
        </Card>
      </div>
    </>
  );
}

'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const chartConfig = {
  stock: {
    label: 'Stock',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function InventoryChart() {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products')) : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const chartData = useMemo(() => {
    if (!products) return [];
    return products
      .map((product) => ({
        name: product.name,
        stock: product.stock,
      }))
      .sort((a, b) => a.stock - b.stock); // Sort ascending to have lowest at the bottom
  }, [products]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Levels</CardTitle>
        <CardDescription>
          Current stock quantity for each product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex h-[500px] w-full items-center justify-center">
            <p className="text-muted-foreground">No inventory data found.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 10, right: 40, top: 10, bottom: 20 }} // Adjusted margins
              >
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                  interval={0}
                />
                <XAxis
                  type="number"
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  allowDecimals={false}
                  label={{ value: 'Quantity', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--foreground))' } }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="stock"
                  fill="var(--color-stock)"
                  radius={[0, 4, 4, 0]}
                  layout="vertical"
                >
                  <LabelList
                    dataKey="stock"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

import { SalesList } from "@/components/sales/sales-list";

export default function SalesPage() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Completed Sales</h1>
            </div>
            <SalesList />
        </div>
    );
}


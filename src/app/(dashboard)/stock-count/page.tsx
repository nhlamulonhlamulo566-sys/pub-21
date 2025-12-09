import { StockCountForm } from "@/components/stock-count/stock-count-form";

export default function StockCountPage() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Stock Count Assistance</h1>
            </div>
            <StockCountForm />
        </div>
    );
}

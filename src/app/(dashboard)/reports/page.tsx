import { InventoryChart } from "@/components/reports/inventory-chart";

export default function ReportsPage() {
    return (
        <div className="flex flex-col">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
            </div>
            <div className="mt-4">
                <InventoryChart />
            </div>
        </div>
    );
}

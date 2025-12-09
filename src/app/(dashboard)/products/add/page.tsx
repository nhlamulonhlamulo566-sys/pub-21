import { AddProductForm } from "@/components/products/add-product-form";

export default function AddProductPage() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Add New Product</h1>
            </div>
            <AddProductForm />
        </div>
    );
}

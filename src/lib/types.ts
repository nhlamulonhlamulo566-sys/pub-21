
export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  stock: number;
  price: number;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  threshold: number;
  imageId?: string;
  imageUrl?: string;
};

export type StockChange = {
  productName: string;
  productSku: string;
  change: number;
  date: string;
};

export type Sale = {
  id: string;
  total: number;
  tax: number;
  subtotal: number;
  amountPaid: number;
  changeDue: number;
  paymentMethod: 'cash' | 'card';
  salespersonId: string;
  salespersonName:string;
  createdAt: any; // Use 'any' for serverTimestamp, will be Date on fetch
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type UserProfile = {
  id: string;
  email: string;
  role: 'administrator' | 'sales';
  phoneNumber?: string;
  createdAt: any; // Firestore timestamp
}

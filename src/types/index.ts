export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  memo: string;
}

export interface Ingredient {
  id: string;
  name: string;
  categoryId: string;
  supplierId: string | null;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchasePriceExTax: number;
  purchasePriceInTax: number;
  taxRate: number;
  baseUnit: string;
  unitCost: number;
  stockQuantity: number;
  status: 'active' | 'inactive';
  memo: string;
  updatedAt: string;
}

export interface PrepItem {
  type?: 'ingredient' | 'prep' | 'custom';
  prepId?: string | null;
  ingredientId: string | null;
  customName?: string;
  quantity: number;
  unit: string;
  rawText: string;
  memo: string;
}

export interface Prep {
  id: string;
  name: string;
  categoryId: string;
  shelfLife: string;
  yieldQuantity: number;
  yieldUnit: string;
  totalCost: number;
  unitCost: number;
  instructions: string[];
  storageMethod: string;
  container: string;
  memo: string;
  imageUrl: string;
  items: PrepItem[];
}

export interface RecipeItem {
  type: 'ingredient' | 'prep' | 'custom';
  id: string | null; // マッチした Ingredient ID または Prep ID
  customName?: string;
  quantity: number;
  unit: string;
  rawText: string;
  memo: string;
}

export interface Recipe {
  id: string;
  name: string;
  categoryId: string;
  sellingPriceExTax: number;
  sellingPriceInTax: number;
  costPrice: number;
  costRate: number;
  grossProfit: number;
  dishware: string;
  instructions: string[];
  imageUrl: string;
  status: 'public' | 'private';
  memo: string;
  items: RecipeItem[];
}

export interface PriceHistory {
  id: string;
  ingredientId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string;
}

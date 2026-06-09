/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Batch {
  id: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  initialQty: number;
  currentQty: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  lowStockThreshold: number;
  initialStock: number;
  unit: string;
  location: string;
  costPrice?: number; // Cost Price in INR
  sellPrice?: number; // Sales Price in INR (SP)
  mrp?: number;       // Max Retail Price in INR (MRP)
  batches?: Batch[];
}

export interface LedgerTransaction {
  id: string;
  itemId: string;
  changeQty: number; // positive for IN, negative for OUT
  operatorName: string;
  reason: string;
  timestamp: string;
  invoiceNumber?: string;
  vendorName?: string;
  totalValue?: string | number;
  invoiceDate?: string;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  vendor: string;
  totalValue: string | number;
  itemCode: string;
  quantity: string | number;
  invoiceDate?: string;
  isMultiProduct?: boolean;
  products?: { sku: string; name: string; qty: number; rate?: number }[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  operator: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string; // e.g. "PRODUCT_CREATION", "PRODUCT_EDIT", "PRODUCT_DELETION", "PURCHASE", "SALE", "INVENTORY_ADJUSTMENT", "EXPENSE_CREATION", "EXPENSE_EDIT", "MANAGER_MODE_ACCESS", "RETURN_CREATION", "BACKUP_RESTORE"
  user: string;
  previousValues?: string;
  newValues?: string;
  deviceInfo: string;
}

export interface SaleItem {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  rate: number;
  gstPercent: number; // Indian GST standard: 18% is typical for cosmetics
  cgst: number; // central GST (half of GST)
  sgst: number; // state GST (half of GST)
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  saleDate: string;
  items: SaleItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalGst: number;
  discount: number;
  grandTotal: number;
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  operator: string;
}

export interface PurchaseItem {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  rate: number;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  purchaseDate: string;
  items: PurchaseItem[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  operator: string;
  // OCR Audit trail storage fields
  originalImage?: string;
  rawOcrText?: string;
  ocrConfidence?: number;
  importTimestamp?: string;
  correctedFields?: string[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
}

export interface ReturnRecord {
  id: string;
  type: "SALES_RETURN" | "PURCHASE_RETURN";
  invoiceNumber: string;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  amount: number;
  date: string;
  reason: string;
  action: "Refund" | "Exchange";
  operator: string;
}

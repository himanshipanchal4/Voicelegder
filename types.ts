export type PaymentStatus = "paid" | "credit";
export type TransactionType = "sale" | "purchase" | "payment";
export type Language = "en" | "hi" | "mr";

export interface TransactionItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Transaction {
  id: string;
  customer_name: string;
  items: TransactionItem[];
  total_amount: number;
  payment_status: PaymentStatus;
  transaction_type: TransactionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  notes?: string;
  confidence?: number;
  source?: "voice" | "text" | "demo" | "manual" | string;
}

export interface CustomerSummary {
  name: string;
  totalOwed: number; // Outstanding Udhaar = Math.max(0, totalCreditSales - totalPayments)
  totalPaid: number; // Actual money received: totalPaidSales + totalPayments
  totalCreditSales: number; // All credit sales given to customer
  totalPayments: number; // All payments/settlements received from customer
  totalPaidSales: number; // Paid sales done with customer
  advancePayment: number; // Math.max(0, totalPayments - totalCreditSales)
  unpaidTransactionsCount: number;
  totalTransactionsCount: number;
  lastTransactionDate: string;
  phone?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  currentQuantity: number;
  unit: string; // kg, litre, packet, bottle, pcs, etc.
  lowStockThreshold: number;
  lastUpdated: string;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  preferredLanguage?: Language;
  defaultLanguage?: Language;
  currency?: string;
  currencySymbol?: string;
  lowStockAlertsEnabled: boolean;
}

export interface ExtractionResult {
  customer_name: string;
  items: TransactionItem[];
  total_amount: number;
  payment_status: PaymentStatus;
  transaction_type: TransactionType;
  date?: string;
  notes?: string;
  confidence: number;
  source?: string;
  warning?: string;
}

export type ActiveTab =
  | "voice"
  | "dashboard"
  | "ledger"
  | "customers"
  | "inventory"
  | "ask"
  | "reports"
  | "settings";

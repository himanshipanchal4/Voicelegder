import { Transaction, InventoryItem, ShopSettings, CustomerSummary } from "../types";
import { initialTransactions, sampleDemoTransactions, initialInventory, initialSettings } from "../data/demoData";

const STORAGE_KEYS = {
  TRANSACTIONS: "voiceledger_transactions_v2",
  INVENTORY: "voiceledger_inventory_v2",
  SETTINGS: "voiceledger_settings_v2",
};

// If a previous session stored legacy demo records, purge them to ensure clean slate
if (typeof window !== "undefined") {
  try {
    if (localStorage.getItem("voiceledger_transactions_v1") !== null) {
      localStorage.removeItem("voiceledger_transactions_v1");
    }
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
}

export const LEDGER_UPDATE_EVENT = "voiceledger_data_updated";

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LEDGER_UPDATE_EVENT));
  }
}

// ---------------- TRANSACTIONS ----------------
export function getStoredTransactions(): Transaction[] {
  if (typeof window === "undefined") return initialTransactions;
  const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
    return initialTransactions;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse stored transactions", e);
    return initialTransactions;
  }
}

export function saveTransaction(
  txn: Omit<Transaction, "id" | "time" | "date"> & { date?: string; time?: string }
): Transaction {
  const list = getStoredTransactions();
  const now = new Date();
  const timeStr = txn.time || now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  
  const newTxn: Transaction = {
    ...txn,
    id: "txn-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    time: timeStr,
    date: txn.date || now.toISOString().split("T")[0],
  };

  const updated = [newTxn, ...list];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  // Check if any matching inventory item should be auto-deducted
  if (txn.items && txn.items.length > 0 && txn.transaction_type === "sale") {
    autoDeductInventoryForSale(txn.items);
  } else if (txn.items && txn.items.length > 0 && txn.transaction_type === "purchase") {
    autoAddInventoryForPurchase(txn.items);
  }

  notifyChange();
  return newTxn;
}

export function updateTransaction(updatedTxn: Transaction): void {
  const list = getStoredTransactions();
  const index = list.findIndex((t) => t.id === updatedTxn.id);
  if (index !== -1) {
    list[index] = updatedTxn;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    notifyChange();
  }
}

export function deleteTransaction(id: string): void {
  const list = getStoredTransactions().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
  notifyChange();
}

export function markAsPaid(id: string): void {
  const list = getStoredTransactions();
  const index = list.findIndex((t) => t.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], payment_status: "paid" };
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    notifyChange();
  }
}

// ---------------- CUSTOMERS ----------------
export function getCustomerSummaries(transactions?: Transaction[]): CustomerSummary[] {
  const txns = transactions || getStoredTransactions();
  const map: { [key: string]: { originalName: string; txns: Transaction[] } } = {};

  for (const t of txns) {
    const rawName = t.customer_name?.trim() || "Walk-in Customer";
    const key = rawName.toLowerCase();
    if (!map[key]) {
      map[key] = { originalName: rawName, txns: [] };
    }
    map[key].txns.push(t);
  }

  return Object.values(map)
    .map(({ originalName, txns: cTxns }) => {
      let totalCreditSales = 0;
      let totalPayments = 0;
      let totalPaidSales = 0;
      let unpaidTransactionsCount = 0;
      let lastDate = "";

      for (const t of cTxns) {
        if (!lastDate || new Date(t.date) > new Date(lastDate)) {
          lastDate = t.date;
        }

        const amt = Number(t.total_amount || 0);

        if (t.transaction_type === "sale") {
          if (t.payment_status === "credit") {
            totalCreditSales += amt;
            unpaidTransactionsCount += 1;
          } else {
            totalPaidSales += amt;
          }
        } else if (t.transaction_type === "payment") {
          totalPayments += amt;
        }
      }

      // Financial Calculation Rules:
      // Outstanding Balance = Total Credit Sales - Total Payments Made Against Credit
      // Never allow pendingUdhaar to become negative.
      const pendingUdhaar = Math.max(0, totalCreditSales - totalPayments);
      const advancePayment = Math.max(0, totalPayments - totalCreditSales);
      // Total lifetime money received from customer (paid sales + settlements):
      const totalPaid = totalPaidSales + totalPayments;

      return {
        name: originalName,
        totalOwed: pendingUdhaar,
        totalPaid,
        totalCreditSales,
        totalPayments,
        totalPaidSales,
        advancePayment,
        unpaidTransactionsCount,
        totalTransactionsCount: cTxns.length,
        lastTransactionDate: lastDate || new Date().toISOString().split("T")[0],
      };
    })
    .sort((a, b) => b.totalOwed - a.totalOwed);
}

export function recordCustomerPayment(
  customerName: string,
  amount: number,
  notes?: string,
  date?: string
): Transaction {
  return saveTransaction({
    customer_name: customerName.trim(),
    items: [{ name: "Udhaar Settlement / जमा", quantity: 1, unit_price: amount }],
    total_amount: Number(amount) || 0,
    payment_status: "paid",
    transaction_type: "payment",
    notes: notes || "Payment received for previous Udhaar",
    date: date || new Date().toISOString().split("T")[0],
    source: "manual",
  });
}

// ---------------- INVENTORY ----------------
export function getStoredInventory(): InventoryItem[] {
  if (typeof window === "undefined") return initialInventory;
  const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(initialInventory));
    return initialInventory;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse inventory", e);
    return initialInventory;
  }
}

export function updateInventoryItem(item: InventoryItem): void {
  const list = getStoredInventory();
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx !== -1) {
    list[idx] = { ...item, lastUpdated: new Date().toISOString().split("T")[0] };
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));
    notifyChange();
  }
}

export function addInventoryItem(item: Omit<InventoryItem, "id" | "lastUpdated">): InventoryItem {
  const list = getStoredInventory();
  const newItem: InventoryItem = {
    ...item,
    id: "inv-" + Date.now(),
    lastUpdated: new Date().toISOString().split("T")[0],
  };
  const updated = [...list, newItem];
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
  notifyChange();
  return newItem;
}

function autoDeductInventoryForSale(items: { name: string; quantity: number }[]) {
  const inv = getStoredInventory();
  let changed = false;
  for (const itm of items) {
    const itemNameLower = itm.name.toLowerCase();
    const matched = inv.find((i) =>
      itemNameLower.includes(i.name.toLowerCase().split(" ")[0]) ||
      i.name.toLowerCase().includes(itemNameLower.split(" ")[0])
    );
    if (matched && matched.currentQuantity > 0) {
      matched.currentQuantity = Math.max(0, matched.currentQuantity - (itm.quantity || 1));
      matched.lastUpdated = new Date().toISOString().split("T")[0];
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
  }
}

function autoAddInventoryForPurchase(items: { name: string; quantity: number }[]) {
  const inv = getStoredInventory();
  let changed = false;
  for (const itm of items) {
    const itemNameLower = itm.name.toLowerCase();
    const matched = inv.find((i) =>
      itemNameLower.includes(i.name.toLowerCase().split(" ")[0]) ||
      i.name.toLowerCase().includes(itemNameLower.split(" ")[0])
    );
    if (matched) {
      matched.currentQuantity += itm.quantity || 1;
      matched.lastUpdated = new Date().toISOString().split("T")[0];
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
  }
}

// ---------------- SETTINGS ----------------
export function getStoredSettings(): ShopSettings {
  if (typeof window === "undefined") return initialSettings;
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
    return initialSettings;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return initialSettings;
  }
}

export function saveStoredSettings(settings: ShopSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  notifyChange();
}

// ---------------- RESET / DEMO DATA ----------------
export function clearAllTransactions(): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  notifyChange();
}

export function resetAppAndData(): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(initialInventory));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
  notifyChange();
}

export function resetToDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sampleDemoTransactions));
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(initialInventory));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
  notifyChange();
}

// ---------------- EXPORT CSV ----------------
export function exportTransactionsToCSV(): void {
  const txns = getStoredTransactions();
  if (txns.length === 0) return;

  const headers = ["ID", "Date", "Time", "Customer", "Items", "Amount (INR)", "Payment Status", "Transaction Type", "Notes"];
  const rows = txns.map((t) => [
    t.id,
    t.date,
    t.time,
    `"${t.customer_name.replace(/"/g, '""')}"`,
    `"${t.items.map((i) => `${i.name} (x${i.quantity})`).join(", ").replace(/"/g, '""')}"`,
    t.total_amount,
    t.payment_status.toUpperCase(),
    t.transaction_type.toUpperCase(),
    `"${(t.notes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `VoiceLedger_Export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

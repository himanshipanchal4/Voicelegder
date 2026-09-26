import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit2,
  CheckCircle,
  Plus,
  ArrowUpDown,
  X,
  Share2,
} from "lucide-react";
import { Transaction, PaymentStatus, TransactionType } from "../types";
import { exportTransactionsToCSV, markAsPaid } from "../utils/storage";

interface LedgerViewProps {
  transactions: Transaction[];
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddNewVoice: () => void;
  initialCustomerFilter?: string;
}

export function LedgerView({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  onAddNewVoice,
  initialCustomerFilter,
}: LedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialCustomerFilter || "");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [customerFilter, setCustomerFilter] = useState<string>(initialCustomerFilter || "all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Distinct customer names for filter dropdown
  const uniqueCustomers = useMemo(() => {
    const set = new Set(transactions.map((t) => t.customer_name));
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Status filter
        if (statusFilter !== "all" && t.payment_status !== statusFilter) return false;
        // Type filter
        if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
        // Customer dropdown filter
        if (customerFilter !== "all" && t.customer_name !== customerFilter) return false;
        // Search bar query (customer, items, notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCustomer = t.customer_name.toLowerCase().includes(q);
          const matchNotes = (t.notes || "").toLowerCase().includes(q);
          const matchItems = t.items.some((i) => i.name.toLowerCase().includes(q));
          if (!matchCustomer && !matchNotes && !matchItems) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "amount-desc") return b.total_amount - a.total_amount;
        if (sortBy === "amount-asc") return a.total_amount - b.total_amount;
        if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
        // date-desc default
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [transactions, statusFilter, typeFilter, customerFilter, searchQuery, sortBy]);

  // Totals for current filtered view
  const totalVolume = filteredTransactions.reduce((s, t) => s + t.total_amount, 0);
  const totalUdhaar = filteredTransactions
    .filter((t) => t.payment_status === "credit")
    .reduce((s, t) => s + t.total_amount, 0);

  if (isPrintMode) {
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto min-h-screen text-slate-900 print:p-0">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">VoiceLedger - Business Account Statement</h1>
            <p className="text-sm text-slate-500">Printed on {new Date().toLocaleString()}</p>
          </div>
          <button
            onClick={() => setIsPrintMode(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-xs rounded-xl print:hidden cursor-pointer"
          >
            Close Print View
          </button>
        </div>

        <div className="mb-4 text-xs flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span>Total Records: {filteredTransactions.length}</span>
          <span>Total Amount: ₹{totalVolume.toLocaleString("en-IN")}</span>
          <span className="text-rose-600 font-bold">Total Udhaar: ₹{totalUdhaar.toLocaleString("en-IN")}</span>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Items</th>
              <th className="p-2 text-right">Amount (₹)</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="p-2 text-slate-600">{t.date} {t.time}</td>
                <td className="p-2 font-bold text-slate-900">{t.customer_name}</td>
                <td className="p-2 text-slate-700">{t.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}</td>
                <td className="p-2 text-right font-bold text-slate-900">₹{t.total_amount.toLocaleString("en-IN")}</td>
                <td className="p-2 text-center font-bold text-[11px]">
                  {t.payment_status === "paid" ? "PAID" : "UDHAAR"}
                </td>
                <td className="p-2 text-center uppercase text-slate-500">{t.transaction_type}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          Generated automatically with VoiceLedger - “Your voice. Your business. Your ledger.”
        </div>
      </div>
    );
  }

  return (
    <div id="ledger-page" className="space-y-6 pb-12">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ledger (बहीखाता)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredTransactions.length} of {transactions.length} total business records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="export-csv-btn"
            onClick={exportTransactionsToCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="print-ledger-btn"
            onClick={() => setIsPrintMode(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Print or save PDF receipt"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            id="record-new-voice-btn"
            onClick={onAddNewVoice}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Voice Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              id="search-ledger-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, items, or notes..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "all" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500"
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "paid" ? "bg-indigo-600 text-white shadow-xs font-bold" : "text-slate-500"
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter("credit")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "credit" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-500"
              }`}
            >
              Udhaar
            </button>
          </div>

          {/* Transaction Type Filter */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                typeFilter === "all" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("sale")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                typeFilter === "sale" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500"
              }`}
            >
              Sale
            </button>
            <button
              onClick={() => setTypeFilter("payment")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                typeFilter === "payment" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500"
              }`}
            >
              Payment (जमा)
            </button>
            <button
              onClick={() => setTypeFilter("purchase")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                typeFilter === "purchase" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500"
              }`}
            >
              Purchase
            </button>
          </div>
        </div>

        {/* Secondary filters: Customer select & Sort */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold">Filter Customer:</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Customers ({uniqueCustomers.length})</option>
              {uniqueCustomers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Chips for Filtered Set */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold px-2">
        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          Showing: {filteredTransactions.length} records
        </span>
        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200">
          Total Filtered Volume: ₹{totalVolume.toLocaleString("en-IN")}
        </span>
        <span className="px-3 py-1.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
          Pending Udhaar in view: ₹{totalUdhaar.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Ledger Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-base font-semibold">No transactions match your current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search terms or selecting 'All'.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 pl-5">Date & Time</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4 text-center">Payment Status</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 pl-5 font-medium text-slate-500 whitespace-nowrap">
                        <span className="text-slate-900 font-bold block">{txn.date}</span>
                        <span className="text-[10px] text-slate-400">{txn.time}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{txn.customer_name}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="text-slate-800 font-medium">
                          {txn.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                        </span>
                        {txn.notes && (
                          <span className="block text-[10px] text-slate-400 italic truncate">
                            “{txn.notes}”
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm whitespace-nowrap">
                        <span className={txn.payment_status === "credit" ? "text-rose-600" : "text-slate-900"}>
                          ₹{txn.total_amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                            txn.transaction_type === "payment"
                              ? "bg-emerald-100 text-emerald-800"
                              : txn.payment_status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {txn.transaction_type === "payment"
                            ? "Paid (Settlement)"
                            : txn.payment_status === "paid"
                            ? "Paid"
                            : "Udhaar"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`capitalize font-semibold text-xs px-2 py-0.5 rounded-md ${
                            txn.transaction_type === "payment"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : txn.transaction_type === "purchase"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {txn.transaction_type === "payment" ? "Payment / जमा" : txn.transaction_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 pr-5 text-right whitespace-nowrap space-x-1.5">
                        {txn.payment_status === "credit" && (
                          <button
                            onClick={() => markAsPaid(txn.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 transition cursor-pointer"
                            title="Mark this udhaar as fully paid"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => onEditTransaction(txn)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(txn.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTransactions.map((txn) => (
                <div key={txn.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{txn.customer_name}</h4>
                      <p className="text-slate-400 text-[10px]">
                        {txn.date} • {txn.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-black block ${
                          txn.payment_status === "credit" ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        ₹{txn.total_amount.toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          txn.transaction_type === "payment"
                            ? "bg-emerald-100 text-emerald-800"
                            : txn.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {txn.transaction_type === "payment"
                          ? "Payment / जमा"
                          : txn.payment_status === "paid"
                          ? "Paid"
                          : "Udhaar"}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 font-medium">
                    {txn.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                  </p>

                  {txn.notes && <p className="text-slate-400 italic text-[11px]">“{txn.notes}”</p>}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {txn.transaction_type}
                    </span>
                    <div className="flex items-center space-x-2">
                      {txn.payment_status === "credit" && (
                        <button
                          onClick={() => markAsPaid(txn.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => onEditTransaction(txn)}
                        className="p-1.5 text-slate-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(txn.id)}
                        className="p-1.5 text-rose-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

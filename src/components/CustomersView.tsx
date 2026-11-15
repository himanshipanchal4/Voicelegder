import React, { useState, useMemo, FormEvent } from "react";
import {
  Users,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
  Phone,
  MessageCircle,
  X,
  PlusCircle,
  Wallet,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { Transaction, CustomerSummary, TransactionType } from "../types";
import { getCustomerSummaries, markAsPaid, recordCustomerPayment } from "../utils/storage";

interface CustomersViewProps {
  transactions: Transaction[];
  onOpenLedgerForCustomer: (customerName: string) => void;
  onRecordNewForCustomer: (customerName: string) => void;
  onOpenAddTransaction?: (customerName?: string, defaultType?: TransactionType) => void;
  preselectedCustomer?: string | null;
}

export function CustomersView({
  transactions,
  onOpenLedgerForCustomer,
  onRecordNewForCustomer,
  onOpenAddTransaction,
  preselectedCustomer,
}: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "outstanding" | "clear">("outstanding");
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(
    preselectedCustomer || null
  );

  // Receive Payment inline state inside customer modal
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("Payment received for previous Udhaar");
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");

  const customerSummaries = useMemo(() => {
    return getCustomerSummaries(transactions);
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    return customerSummaries.filter((c) => {
      if (filterMode === "outstanding" && c.totalOwed <= 0) return false;
      if (filterMode === "clear" && c.totalOwed > 0) return false;
      if (searchQuery.trim()) {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [customerSummaries, filterMode, searchQuery]);

  const totalOwedAll = customerSummaries.reduce((s, c) => s + c.totalOwed, 0);
  const totalDebtorsCount = customerSummaries.filter((c) => c.totalOwed > 0).length;

  // Selected customer's transactions (case-insensitive)
  const selectedCustomerTransactions = useMemo(() => {
    if (!selectedCustomerName) return [];
    const target = selectedCustomerName.trim().toLowerCase();
    return transactions.filter((t) => t.customer_name?.trim().toLowerCase() === target);
  }, [selectedCustomerName, transactions]);

  const selectedSummary = useMemo(() => {
    if (!selectedCustomerName) return null;
    const target = selectedCustomerName.trim().toLowerCase();
    return customerSummaries.find((c) => c.name.trim().toLowerCase() === target);
  }, [selectedCustomerName, customerSummaries]);

  // Handle saving customer payment directly
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerName) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) return;

    recordCustomerPayment(
      selectedCustomerName,
      amt,
      paymentNotes || "Payment received for previous Udhaar",
      paymentDate || new Date().toISOString().split("T")[0]
    );

    setPaymentSuccessMsg(`✓ ₹${amt.toLocaleString("en-IN")} payment recorded against Udhaar!`);
    setPaymentAmount("");
    setIsPaymentFormOpen(false);
    setTimeout(() => setPaymentSuccessMsg(""), 4000);
  };

  // WhatsApp reminder generator
  const getWhatsAppReminderUrl = (name: string, amount: number) => {
    const text = `Namaste ${name} ji, Sharma General Store se aapka baaki udhaar ₹${amount.toLocaleString(
      "en-IN"
    )} hai. Kripya samay par UPI ya cash se payment kar dijiye. Dhanyawad!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div id="customers-outstanding-page" className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Customer Udhaar Khata (उधार खाता)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track unpaid balances, payment history, and send polite payment reminders
          </p>
        </div>

        {/* Global Outstanding Stats */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Udhaar Owed</span>
            <span className="text-xl font-black text-rose-600">₹{totalOwedAll.toLocaleString("en-IN")}</span>
          </div>
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Pending Debtors</span>
            <span className="text-xl font-black text-slate-900">{totalDebtorsCount}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer by name (Sharma, Ramesh, Priya...)"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs shrink-0">
          <button
            onClick={() => setFilterMode("outstanding")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              filterMode === "outstanding" ? "bg-rose-600 text-white shadow-xs font-bold" : "text-slate-600"
            }`}
          >
            With Udhaar ({totalDebtorsCount})
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              filterMode === "all" ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-600"
            }`}
          >
            All Customers ({customerSummaries.length})
          </button>
          <button
            onClick={() => setFilterMode("clear")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              filterMode === "clear" ? "bg-indigo-600 text-white shadow-xs font-bold" : "text-slate-600"
            }`}
          >
            Fully Paid
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
            <h3 className="font-bold text-slate-700 text-sm">No customers recorded yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Customer accounts and Khata balances are created automatically when you record an Udhaar sale, payment, or manual transaction.
            </p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
          const isHighDebt = cust.totalOwed >= 1000;
          return (
            <div
              key={cust.name}
              id={`customer-card-${cust.name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setSelectedCustomerName(cust.name)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative overflow-hidden bg-white ${
                isHighDebt ? "border-rose-300 shadow-xs" : "border-slate-200 shadow-xs"
              }`}
            >
              {isHighDebt && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-bl-lg flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>High Balance</span>
                </div>
              )}

              <div className="flex items-center space-x-3 mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-xs ${
                    cust.totalOwed > 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {cust.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">{cust.name}</h3>
                  <span className="text-[11px] text-slate-400">
                    Last active: {cust.lastTransactionDate}
                  </span>
                </div>
              </div>

              {/* Amount Owed Display */}
              <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Outstanding Udhaar
                  </span>
                  {cust.totalOwed > 0 ? (
                    <span className="text-xl font-black text-rose-600">
                      ₹{cust.totalOwed.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="text-lg font-black text-emerald-600">₹0</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        🟢 Clear
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Lifetime Paid
                  </span>
                  <span className="text-sm font-black text-indigo-700">
                    ₹{cust.totalPaid.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Quick Actions inside card */}
              <div className="pt-2 flex items-center justify-between text-xs font-semibold gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomerName(cust.name);
                    setIsPaymentFormOpen(false);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  View History ({cust.totalTransactionsCount}) →
                </button>

                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerName(cust.name);
                      setIsPaymentFormOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 cursor-pointer flex items-center space-x-1"
                    title="Record payment from customer"
                  >
                    <Wallet className="w-3 h-3 text-emerald-600" />
                    <span>+ Payment</span>
                  </button>

                  {cust.totalOwed > 0 && (
                    <a
                      href={getWhatsAppReminderUrl(cust.name, cust.totalOwed)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg bg-green-50 text-green-800 hover:bg-green-100 flex items-center space-x-1 border border-green-200 cursor-pointer"
                      title="Send WhatsApp payment reminder"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Customer Detail Modal / Statement Drawer */}
      {selectedCustomerName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="bg-[#0F172A] text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center">
                  {selectedCustomerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-white">{selectedCustomerName}</h3>
                  <p className="text-xs text-slate-400">Customer Account Statement & Payment History</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomerName(null);
                  setIsPaymentFormOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Balances bar */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Pending Udhaar:</span>
                {selectedSummary && selectedSummary.totalOwed > 0 ? (
                  <span className="text-xl font-black text-rose-600">
                    ₹{selectedSummary.totalOwed.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-xl font-black text-emerald-600">₹0</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      🟢 No Outstanding Balance
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Credit Given:</span>
                <span className="text-lg font-black text-slate-800">
                  ₹{(selectedSummary?.totalCreditSales || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Payments Made:</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{(selectedSummary?.totalPayments || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Total Lifetime Paid:</span>
                <span className="text-lg font-black text-indigo-700">
                  ₹{(selectedSummary?.totalPaid || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-1 sm:pt-0">
                <button
                  onClick={() => setIsPaymentFormOpen(!isPaymentFormOpen)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isPaymentFormOpen ? "Close Payment" : "+ Receive Payment"}</span>
                </button>

                {selectedSummary && selectedSummary.totalOwed > 0 && (
                  <a
                    href={getWhatsAppReminderUrl(selectedCustomerName, selectedSummary.totalOwed)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    if (onOpenAddTransaction) {
                      onOpenAddTransaction(selectedCustomerName);
                    } else {
                      onRecordNewForCustomer(selectedCustomerName);
                    }
                    setSelectedCustomerName(null);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Txn</span>
                </button>
              </div>
            </div>

            {/* Success message banner */}
            {paymentSuccessMsg && (
              <div className="px-6 py-2.5 bg-emerald-100 border-b border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            {/* In-line Receive Payment Form */}
            {isPaymentFormOpen && (
              <div className="p-5 bg-emerald-50/70 border-b border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      ₹
                    </div>
                    <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                      Receive Payment (उधार जमा) from {selectedCustomerName}
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsPaymentFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Payment received for previous Udhaar"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsPaymentFormOpen(false)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer transition"
                    >
                      ✓ Save Payment (जमा करें)
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List of transactions for this customer */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                All Transactions with {selectedCustomerName} ({selectedCustomerTransactions.length})
              </h4>

              {selectedCustomerTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recorded transactions.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {selectedCustomerTransactions.map((t) => {
                    const isPayment = t.transaction_type === "payment";
                    const isCreditSale = t.transaction_type === "sale" && t.payment_status === "credit";
                    const isPaidSale = t.transaction_type === "sale" && t.payment_status === "paid";
                    const isPurchase = t.transaction_type === "purchase";

                    return (
                      <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">
                              {isPayment
                                ? "💰 Payment Received (जमा)"
                                : t.items.map((i) => i.name).join(", ") || "General Goods"}
                            </span>
                            {isPayment && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                💰 Payment
                              </span>
                            )}
                            {isCreditSale && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                🔴 Udhaar
                              </span>
                            )}
                            {isPaidSale && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🛒 Paid Sale
                              </span>
                            )}
                            {isPurchase && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                📦 Purchase
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            {t.date} at {t.time} • {isPayment ? "Payment against credit" : t.transaction_type}
                          </p>
                          {t.notes && <p className="text-slate-600 italic text-[11px] mt-0.5">“{t.notes}”</p>}
                        </div>

                        <div className="text-right space-y-1">
                          <span
                            className={`font-black text-sm block ${
                              isPayment
                                ? "text-emerald-600"
                                : isCreditSale
                                ? "text-rose-600"
                                : "text-slate-900"
                            }`}
                          >
                            {isPayment ? `+₹${t.total_amount.toLocaleString("en-IN")}` : `₹${t.total_amount.toLocaleString("en-IN")}`}
                          </span>
                          {isCreditSale && (
                            <button
                              onClick={() => markAsPaid(t.id)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-xs transition"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial summary footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3 text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Credit</span>
                  <span className="font-extrabold text-slate-800">
                    ₹{(selectedSummary?.totalCreditSales || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Payments</span>
                  <span className="font-extrabold text-emerald-600">
                    ₹{(selectedSummary?.totalPayments || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Pending Udhaar</span>
                  <span className={`font-black ${selectedSummary && selectedSummary.totalOwed > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {selectedSummary && selectedSummary.totalOwed > 0 ? `₹${selectedSummary.totalOwed.toLocaleString("en-IN")}` : "₹0 (Clear)"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomerName(null);
                  setIsPaymentFormOpen(false);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Wallet,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Mic,
  Calendar,
  Sparkles,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";
import { Transaction, InventoryItem, ShopSettings, CustomerSummary } from "../types";
import { getCustomerSummaries } from "../utils/storage";

interface DashboardViewProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  settings: ShopSettings;
  onNavigateTab: (tab: any) => void;
  onSelectCustomer?: (customerName: string) => void;
}

export function DashboardView({
  transactions,
  inventory,
  settings,
  onNavigateTab,
  onSelectCustomer,
}: DashboardViewProps) {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculations
  const todaysTransactions = transactions.filter((t) => t.date === todayStr);
  const activeTxns = todaysTransactions.length > 0 ? todaysTransactions : transactions.slice(0, 12);

  // Today's Sales (sales type only - payments against credit are NOT sales)
  const todaysSales = activeTxns
    .filter((t) => t.transaction_type === "sale")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  // Today's Collected (cash from paid sales + payments collected against credit)
  const todaysCollected = activeTxns
    .filter((t) => t.payment_status === "paid")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  // Today's Outstanding / Credit given
  const todaysCredit = activeTxns
    .filter((t) => t.transaction_type === "sale" && t.payment_status === "credit")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  const txnCount = activeTxns.length;

  // Purchases
  const todaysPurchases = activeTxns
    .filter((t) => t.transaction_type === "purchase")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  // Customer summaries
  const customerSummaries: CustomerSummary[] = getCustomerSummaries(transactions);
  const topDebtors = customerSummaries.filter((c) => c.totalOwed > 0).slice(0, 4);
  const highestCreditCustomer = topDebtors[0]?.name || "None";

  // Low stock inventory items
  const lowStockItems = inventory.filter((item) => item.currentQuantity <= item.lowStockThreshold);

  // Paid vs Credit ratio calculation for donut chart
  const totalVolume = todaysCollected + todaysCredit || 1;
  const paidPercent = Math.round((todaysCollected / totalVolume) * 100);
  const creditPercent = 100 - paidPercent;

  // Recent 6 transactions
  const recentTransactions = [...transactions].slice(0, 6);

  return (
    <div id="dashboard-page" className="space-y-6 pb-8">
      {/* Top Greeting Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {settings.ownerName || "Shopkeeper"} 👋
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            “Here’s how {settings.shopName || "your business"} is doing today.”
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 flex items-center space-x-1.5 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>

          <button
            id="dashboard-record-voice-btn"
            onClick={() => onNavigateTab("voice")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speak Entry</span>
          </button>
        </div>
      </div>

      {/* 4 Major Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div
          id="metric-todays-sales"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales (कुल बिक्री)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ₹{todaysSales.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-green-600 font-bold bg-green-50 border border-green-200/60 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
            <span>From voice & logged sales</span>
          </div>
        </div>

        {/* Card 2: Collected (Paid) */}
        <div
          id="metric-collected"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Collected (जमा रकम)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ₹{todaysCollected.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
              Paid
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-indigo-700 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Cash & UPI cleared</span>
          </div>
        </div>

        {/* Card 3: Outstanding Credit */}
        <div
          id="metric-outstanding"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Udhaar (बाकी उधार)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight">
              ₹{todaysCredit.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
              Pending
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-rose-600 flex items-center">
            <span>Udhaar given today</span>
          </div>
        </div>

        {/* Card 4: Transactions */}
        <div
          id="metric-transactions"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Customer Khata (ग्राहक खाता)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {txnCount}
            </span>
            <span className="text-[10px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {customerSummaries.length} Total
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center">
            <span>{topDebtors.length} with pending balances</span>
          </div>
        </div>
      </div>

      {/* Dynamic Natural Language Daily Summary Box (Geometric Balance Dark Indigo Banner) */}
      <div
        id="natural-language-daily-summary"
        className="p-5 rounded-2xl bg-indigo-900 text-white shadow-md relative overflow-hidden"
      >
        <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>AI Daily Business Summary</span>
        </div>
        <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-100">
          “Today you made <span className="font-bold text-emerald-300">₹{todaysSales.toLocaleString("en-IN")}</span> in
          sales. <span className="font-bold text-indigo-200">₹{todaysCollected.toLocaleString("en-IN")}</span> was
          collected in cash. <span className="font-bold text-rose-300">₹{todaysCredit.toLocaleString("en-IN")}</span>{" "}
          remains outstanding. Your highest credit customer is{" "}
          <span className="font-bold underline decoration-amber-400 underline-offset-4">{highestCreditCustomer}</span>.”
        </p>
        <div className="mt-3 pt-3 border-t border-indigo-800 flex flex-wrap items-center justify-between text-xs text-indigo-300 gap-2">
          <span>Purchases today: ₹{todaysPurchases.toLocaleString("en-IN")}</span>
          <button
            onClick={() => onNavigateTab("ask")}
            className="text-indigo-200 hover:text-white font-semibold flex items-center space-x-1 cursor-pointer transition"
          >
            <span>Ask more questions about today</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      {settings.lowStockAlertsEnabled && lowStockItems.length > 0 && (
        <div
          id="low-stock-alert-banner"
          className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>⚠ LOW STOCK ALERTS</span>
            </div>
            <button
              onClick={() => onNavigateTab("inventory")}
              className="text-xs text-amber-900 font-semibold underline hover:text-amber-700 cursor-pointer"
            >
              View Inventory ({inventory.length} items)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{item.name}</span>
                  <span className="text-amber-700 font-semibold">
                    Only {item.currentQuantity} {item.unit} remaining
                  </span>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[10px] uppercase">
                  Reorder
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts & Outstanding Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paid vs Credit Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Paid vs Udhaar Distribution</h3>
            <span className="text-xs text-slate-400 font-medium">Today</span>
          </div>

          <div className="flex flex-col items-center justify-center my-4">
            {/* SVG Donut */}
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-slate-100"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-600 transition-all duration-1000 ease-out"
                  strokeDasharray={`${paidPercent}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">{paidPercent}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Collected</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full flex items-center justify-around mt-4 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                <div>
                  <span className="text-slate-500 block">Paid ({paidPercent}%)</span>
                  <span className="font-bold text-slate-800">₹{todaysCollected.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <div>
                  <span className="text-slate-500 block">Udhaar ({creditPercent}%)</span>
                  <span className="font-bold text-rose-600">₹{todaysCredit.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Customers Quick List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-800 text-sm">Top Outstanding Customers (Udhaar Khata)</h3>
            </div>
            <button
              onClick={() => onNavigateTab("customers")}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              View All ({customerSummaries.filter((c) => c.totalOwed > 0).length})
            </button>
          </div>

          <div className="space-y-3">
            {topDebtors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All customer payments are clear! 🎉</p>
            ) : (
              topDebtors.map((cust, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (onSelectCustomer) onSelectCustomer(cust.name);
                    onNavigateTab("customers");
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 font-bold text-sm flex items-center justify-center">
                      {cust.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">{cust.name}</h4>
                      <p className="text-xs text-slate-500">
                        {cust.unpaidTransactionsCount} unpaid transactions • Last: {cust.lastTransactionDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-rose-600 text-base block">
                      ₹{cust.totalOwed.toLocaleString("en-IN")}
                    </span>
                    {cust.totalOwed > 1000 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        High Balance
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table (Geometric Balance Table Styling) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Recent Transactions</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab("table")}
              className="text-xs text-slate-600 hover:text-indigo-600 font-semibold cursor-pointer"
            >
              Table View ↗
            </button>
            <button
              onClick={() => onNavigateTab("ledger")}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Open Full Ledger ({transactions.length}) →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold tracking-widest">
              <tr>
                <th className="p-3 pl-5">Customer</th>
                <th className="p-3">Transaction Details</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 pr-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No transactions recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click the voice mic button or "+ New Transaction" to record your first sale or Udhaar entry.
                    </p>
                  </td>
                </tr>
              ) : (
                recentTransactions.map((txn) => {
                const isPayment = txn.transaction_type === "payment";
                const isCredit = txn.transaction_type === "sale" && txn.payment_status === "credit";
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 pl-5 font-bold text-slate-900 whitespace-nowrap">
                      {txn.customer_name}
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600">
                      <span className="font-medium text-slate-800">
                        {isPayment
                          ? "💰 Payment Received (जमा)"
                          : txn.items.map((i) => `${i.name} (x${i.quantity})`).join(", ") || "General Goods"}
                      </span>
                      {txn.notes && (
                        <span className="block text-[10px] text-slate-400 italic truncate">
                          “{txn.notes}”
                        </span>
                      )}
                    </td>
                    <td className={`p-3 font-bold text-sm whitespace-nowrap ${isPayment ? "text-emerald-600" : isCredit ? "text-rose-600" : "text-slate-900"}`}>
                      {isPayment ? `+₹${txn.total_amount.toLocaleString("en-IN")}` : `₹${txn.total_amount.toLocaleString("en-IN")}`}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          isPayment
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : txn.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isPayment ? "💰 Payment" : txn.payment_status === "paid" ? "Paid" : "Udhaar"}
                      </span>
                    </td>
                    <td className="p-3 pr-5 text-right text-slate-400 whitespace-nowrap font-medium text-[11px]">
                      {txn.time}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Users,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Transaction, InventoryItem } from "../types";
import { getCustomerSummaries, exportTransactionsToCSV } from "../utils/storage";

interface ReportsViewProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
}

export function ReportsView({ transactions, inventory }: ReportsViewProps) {
  // Aggregate sales & metrics
  const totalSales = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === "sale")
      .reduce((s, t) => s + t.total_amount, 0);
  }, [transactions]);

  const totalPurchases = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === "purchase")
      .reduce((s, t) => s + t.total_amount, 0);
  }, [transactions]);

  const totalCashCollected = useMemo(() => {
    return transactions
      .filter((t) => t.payment_status === "paid")
      .reduce((s, t) => s + t.total_amount, 0);
  }, [transactions]);

  const totalPendingCredit = useMemo(() => {
    return getCustomerSummaries(transactions).reduce((s, c) => s + c.totalOwed, 0);
  }, [transactions]);

  // Top selling items
  const topSellingItems = useMemo(() => {
    const itemMap: { [name: string]: { count: number; volume: number } } = {};
    for (const t of transactions) {
      if (t.transaction_type === "sale") {
        for (const itm of t.items) {
          const key = itm.name.trim();
          if (!itemMap[key]) itemMap[key] = { count: 0, volume: 0 };
          itemMap[key].count += itm.quantity || 1;
          itemMap[key].volume += (itm.quantity || 1) * (itm.unit_price || 0);
        }
      }
    }
    return Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [transactions]);

  // Top credit customers
  const topCreditCustomers = useMemo(() => {
    return getCustomerSummaries(transactions)
      .filter((c) => c.totalOwed > 0)
      .slice(0, 5);
  }, [transactions]);

  // Group by Date for Weekly Sales Bar Chart
  const salesByDay = useMemo(() => {
    const map: { [date: string]: number } = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const t of sorted) {
      if (t.transaction_type === "sale") {
        map[t.date] = (map[t.date] || 0) + t.total_amount;
      }
    }
    const entries = Object.entries(map).slice(-7); // Last 7 days
    const maxVal = Math.max(...entries.map(([, v]) => v), 1000);
    return entries.map(([date, amount]) => ({
      date: date.split("-").slice(1).join("/"), // MM/DD
      amount,
      heightPercent: Math.round((amount / maxVal) * 100),
    }));
  }, [transactions]);

  return (
    <div id="reports-insights-page" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reports & Business Insights (हिसाब-किताब)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clear, actionable business metrics designed for Indian shopkeepers
          </p>
        </div>

        <button
          onClick={exportTransactionsToCSV}
          className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Financial Report (CSV)</span>
        </button>
      </div>

      {/* 4 Financial Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Gross Sales Volume
          </span>
          <span className="text-2xl font-black text-indigo-600">
            ₹{totalSales.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">From all recorded sales</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Cash Inflow (Collected)
          </span>
          <span className="text-2xl font-black text-slate-800">
            ₹{totalCashCollected.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Cash & UPI receipts</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Outstanding Udhaar (To Collect)
          </span>
          <span className="text-2xl font-black text-rose-600">
            ₹{totalPendingCredit.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Uncollected customer credit</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Stock Purchases
          </span>
          <span className="text-2xl font-black text-slate-700">
            ₹{totalPurchases.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Restock expenses</span>
        </div>
      </div>

      {/* Weekly Sales Bar Chart */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Sales Trend (Last 7 Days)</h3>
            <p className="text-xs text-slate-400">Daily business volume in ₹</p>
          </div>
          <span className="text-xs font-bold text-indigo-700 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-200">
            Active Trend
          </span>
        </div>

        {/* CSS/SVG Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-slate-200">
          {salesByDay.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#0F172A] text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10">
                ₹{day.amount.toLocaleString("en-IN")}
              </div>
              <div
                className="w-full max-w-[42px] bg-indigo-600 group-hover:bg-indigo-700 rounded-t-lg transition-all"
                style={{ height: `${Math.max(15, day.heightPercent)}%` }}
              />
              <span className="text-[10px] font-bold text-slate-600 mt-2">{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column: Top Selling Items & Top Udhaar Debtors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">Top-Selling Items</h3>
          </div>

          <div className="space-y-3">
            {topSellingItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
            ) : (
              topSellingItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                      <span className="text-slate-400 text-[11px]">{item.count} units sold</span>
                    </div>
                  </div>
                  <span className="font-black text-sm text-slate-900">
                    ₹{item.volume.toLocaleString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Credit Customers */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-base text-slate-900">Highest Outstanding Customers</h3>
          </div>

          <div className="space-y-3">
            {topCreditCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All customer accounts are clear! 🎉</p>
            ) : (
              topCreditCustomers.map((cust, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{cust.name}</span>
                    <span className="text-slate-400 text-[11px]">
                      {cust.unpaidTransactionsCount} unpaid credit entries
                    </span>
                  </div>
                </div>
                <span className="font-black text-sm text-rose-600">
                  ₹{cust.totalOwed.toLocaleString("en-IN")}
                </span>
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}

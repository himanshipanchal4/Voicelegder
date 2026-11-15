import React, { useState, useMemo } from "react";
import {
  Table as TableIcon,
  Search,
  Download,
  Printer,
  ArrowUpDown,
  Filter,
  CheckCircle,
  Clock,
  Banknote,
  QrCode,
  CreditCard,
  Eye,
  Edit2,
  User,
  Users,
  Calendar,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Transaction, TransactionItem, CustomerSummary } from "../types";
import { getCustomerSummaries } from "../utils/storage";

interface TableViewProps {
  transactions: Transaction[];
  onEditTransaction?: (txn: Transaction) => void;
  onSelectCustomer?: (customerName: string) => void;
}

type SortField = "date" | "customer_name" | "total_amount" | "items";
type SortOrder = "asc" | "desc";
type ModeFilter = "all" | "cash" | "upi" | "credit" | "payment";
type StatusFilter = "all" | "paid" | "credit";
type ViewMode = "records" | "persons";

export function TableView({
  transactions,
  onEditTransaction,
  onSelectCustomer,
}: TableViewProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("records");

  // Selected transaction for quick detail modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Customer summaries for accurate balance and person directory
  const customerSummaries = useMemo(() => {
    return getCustomerSummaries(transactions);
  }, [transactions]);

  // Map of customer lower-case name to total owed
  const customerBalances = useMemo(() => {
    const map: { [key: string]: number } = {};
    customerSummaries.forEach((c) => {
      map[c.name.trim().toLowerCase()] = c.totalOwed;
    });
    return map;
  }, [customerSummaries]);

  // List of all unique persons from the Khata
  const allPersons = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.customer_name?.trim()) {
        set.add(t.customer_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Helper to determine payment mode
  const getPaymentModeInfo = (txn: Transaction) => {
    const notes = (txn.notes || "").toLowerCase();
    const isCredit = txn.payment_status === "credit";
    const isSettlement = txn.transaction_type === "payment";

    if (isSettlement) {
      if (
        notes.includes("upi") ||
        notes.includes("online") ||
        notes.includes("phonepe") ||
        notes.includes("gpay") ||
        notes.includes("paytm")
      ) {
        return {
          id: "upi",
          name: "UPI (जमा)",
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          icon: QrCode,
        };
      }
      return {
        id: "payment",
        name: "Udhaar Settlement (जमा)",
        badge: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Receipt,
      };
    }

    if (isCredit) {
      return {
        id: "credit",
        name: "Udhaar / Credit (उधार)",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        icon: CreditCard,
      };
    }

    if (
      notes.includes("upi") ||
      notes.includes("online") ||
      notes.includes("phonepe") ||
      notes.includes("gpay") ||
      notes.includes("paytm") ||
      notes.includes("qr") ||
      notes.includes("scan")
    ) {
      return {
        id: "upi",
        name: "UPI / Online (ऑनलाइन)",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        icon: QrCode,
      };
    }

    return {
      id: "cash",
      name: "Cash (नकद)",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: Banknote,
    };
  };

  // Helper to format items bought
  const formatItemsBought = (txn: Transaction) => {
    if (txn.transaction_type === "payment") {
      return {
        display: "Udhaar Settlement / जमा",
        count: 0,
        isSettlement: true,
      };
    }
    if (!txn.items || txn.items.length === 0) {
      return {
        display: txn.notes || "General Goods",
        count: 1,
        isSettlement: false,
      };
    }
    const display = txn.items
      .map((item) => `${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ""}`)
      .join(", ");
    return {
      display,
      count: txn.items.length,
      isSettlement: false,
    };
  };

  // Date boundary filters
  const todayStr = new Date().toISOString().split("T")[0];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];

  // Filtered & Sorted Transactions for the Table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search query filter (matches customer name, items bought, notes, amount)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.customer_name?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        const matchesAmount = t.total_amount?.toString().includes(q);
        const matchesItems = t.items?.some((i) => i.name.toLowerCase().includes(q));
        const matchesMode = getPaymentModeInfo(t).name.toLowerCase().includes(q);
        if (!matchesName && !matchesNotes && !matchesAmount && !matchesItems && !matchesMode) {
          return false;
        }
      }

      // Customer filter
      if (selectedCustomer !== "all") {
        if (t.customer_name?.trim().toLowerCase() !== selectedCustomer.toLowerCase()) {
          return false;
        }
      }

      // Payment Mode filter
      if (modeFilter !== "all") {
        const pMode = getPaymentModeInfo(t).id;
        if (pMode !== modeFilter) return false;
      }

      // Payment Status filter
      if (statusFilter !== "all") {
        if (t.payment_status !== statusFilter) return false;
      }

      // Date Filter
      if (dateFilter === "today" && t.date !== todayStr) return false;
      if (dateFilter === "week" && t.date < oneWeekAgoStr) return false;
      if (dateFilter === "month" && t.date < oneMonthAgoStr) return false;

      return true;
    }).sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(`${a.date} ${a.time || "00:00"}`).getTime();
        const dateB = new Date(`${b.date} ${b.time || "00:00"}`).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (sortField === "customer_name") {
        const nameA = (a.customer_name || "").toLowerCase();
        const nameB = (b.customer_name || "").toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortField === "total_amount") {
        return sortOrder === "asc" ? a.total_amount - b.total_amount : b.total_amount - a.total_amount;
      }
      if (sortField === "items") {
        const countA = a.items?.length || 0;
        const countB = b.items?.length || 0;
        return sortOrder === "asc" ? countA - countB : countB - countA;
      }
      return 0;
    });
  }, [
    transactions,
    searchQuery,
    selectedCustomer,
    modeFilter,
    statusFilter,
    dateFilter,
    sortField,
    sortOrder,
    todayStr,
    oneWeekAgoStr,
    oneMonthAgoStr,
  ]);

  // Overall Khata Statistics for the header cards
  const stats = useMemo(() => {
    const totalRecords = filteredTransactions.length;
    const totalAmount = filteredTransactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
    const totalCollected = filteredTransactions
      .filter((t) => t.payment_status === "paid")
      .reduce((acc, t) => acc + (t.total_amount || 0), 0);
    const totalPendingCredit = customerSummaries.reduce((acc, c) => acc + (c.totalOwed || 0), 0);
    const personsCount = allPersons.length;

    return {
      totalRecords,
      totalAmount,
      totalCollected,
      totalPendingCredit,
      personsCount,
    };
  }, [filteredTransactions, customerSummaries, allPersons]);

  // Export Table to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Date",
      "Time",
      "Person Name",
      "Items Bought",
      "Payment Mode",
      "Amount (INR)",
      "Payment Status",
      "Transaction Type",
      "Person Pending Udhaar (INR)",
      "Notes",
    ];

    const rows = filteredTransactions.map((t, index) => {
      const mode = getPaymentModeInfo(t).name;
      const items = formatItemsBought(t).display;
      const balance = customerBalances[t.customer_name?.trim().toLowerCase()] ?? 0;
      return [
        index + 1,
        `"${t.date}"`,
        `"${t.time}"`,
        `"${(t.customer_name || "Walk-in").replace(/"/g, '""')}"`,
        `"${items.replace(/"/g, '""')}"`,
        `"${mode}"`,
        t.total_amount,
        `"${t.payment_status === "paid" ? "Paid" : "Udhaar / Credit"}"`,
        `"${t.transaction_type}"`,
        balance,
        `"${(t.notes || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `khata_table_record_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Toggle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "total_amount" ? "desc" : "asc");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <TableIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Khata Table Records
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                खाता तालिका
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Simple, comprehensive record of all persons from the Khata with items bought, payment mode, and amounts.
            </p>
          </div>

          {/* Action Buttons & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                id="tab-view-records"
                onClick={() => setViewMode("records")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "records"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>All Records Table</span>
              </button>
              <button
                id="tab-view-persons"
                onClick={() => setViewMode("persons")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "persons"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Persons Khata ({allPersons.length})</span>
              </button>
            </div>

            {/* Export CSV */}
            <button
              id="export-table-csv-button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Download simple record as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* Print View */}
            <button
              id="print-table-button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Print record table"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Persons in Khata
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-slate-900">
                {stats.personsCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">customers</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Khata Records
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-slate-900">
                {stats.totalRecords}
              </span>
              <span className="text-xs text-slate-500 font-medium">entries</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Total Collected
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-emerald-700">
                ₹{stats.totalCollected.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">नकद/UPI</span>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Total Pending Udhaar
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-amber-700">
                ₹{stats.totalPendingCredit.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-amber-600 font-bold">बाकी</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              id="table-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by person name, item bought, payment mode, or amount..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter by Person Dropdown */}
          <div className="w-full md:w-56">
            <select
              id="filter-person-select"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Persons ({allPersons.length})</option>
              {allPersons.map((name) => {
                const bal = customerBalances[name.toLowerCase()] || 0;
                return (
                  <option key={name} value={name}>
                    {name} {bal > 0 ? `(Owes ₹${bal})` : "✓"}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter by Payment Mode Dropdown */}
          <div className="w-full md:w-48">
            <select
              id="filter-mode-select"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash (नकद)</option>
              <option value="upi">UPI / Online (ऑनलाइन)</option>
              <option value="credit">Udhaar / Credit (उधार)</option>
              <option value="payment">Settlement (जमा)</option>
            </select>
          </div>

          {/* Filter by Status Dropdown */}
          <div className="w-full md:w-36">
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid (चुकता)</option>
              <option value="credit">Udhaar (बाकी)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges / Date presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase mr-1">Period:</span>
            {(["all", "today", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer capitalize ${
                  dateFilter === period
                    ? "bg-slate-800 text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {period === "all"
                  ? "All Time"
                  : period === "today"
                  ? "Today"
                  : period === "week"
                  ? "Last 7 Days"
                  : "Last 30 Days"}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredTransactions.length}</span> of{" "}
            <span className="font-bold text-slate-800">{transactions.length}</span> entries
          </div>
        </div>
      </div>

      {/* VIEW 1: ALL RECORDS TABLE (TRANSACTION-BY-TRANSACTION) */}
      {viewMode === "records" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400 font-semibold">#</th>
                  <th
                    onClick={() => handleSort("date")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("customer_name")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Person Name (ग्राहक)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">
                    <span>Item Buyed (सामान)</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span>Payment Mode (भुगतान)</span>
                  </th>
                  <th
                    onClick={() => handleSort("total_amount")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition text-right whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount (रुपये)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span>Status</span>
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span>Net Balance (बाकी)</span>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap w-24">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No matching records found</p>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search query, person filter, or payment mode filter.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCustomer("all");
                            setModeFilter("all");
                            setStatusFilter("all");
                            setDateFilter("all");
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn, index) => {
                    const modeInfo = getPaymentModeInfo(txn);
                    const itemsInfo = formatItemsBought(txn);
                    const customerBalance =
                      customerBalances[txn.customer_name?.trim().toLowerCase()] ?? 0;
                    const ModeIcon = modeInfo.icon;

                    return (
                      <tr
                        key={txn.id}
                        id={`table-row-${txn.id}`}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* Sl No */}
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400 font-medium">
                          {index + 1}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                            {new Date(txn.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 inline" />
                            <span>{txn.time || "—"}</span>
                          </div>
                        </td>

                        {/* Person Name */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                              {(txn.customer_name || "W")[0].toUpperCase()}
                            </div>
                            <div>
                              <button
                                onClick={() => {
                                  if (onSelectCustomer && txn.customer_name) {
                                    onSelectCustomer(txn.customer_name);
                                  } else {
                                    setSelectedCustomer(txn.customer_name);
                                  }
                                }}
                                className="font-bold text-slate-900 hover:text-indigo-600 transition text-left cursor-pointer flex items-center gap-1"
                              >
                                <span>{txn.customer_name || "Walk-in Customer"}</span>
                              </button>
                              {txn.notes && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                  {txn.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Items Buyed */}
                        <td className="py-3 px-4">
                          {itemsInfo.isSettlement ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                              <Receipt className="w-3 h-3 shrink-0" />
                              <span>Udhaar Settlement (जमा)</span>
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-medium text-slate-800 text-xs sm:text-sm leading-snug">
                                {itemsInfo.display}
                              </p>
                              {txn.items && txn.items.length > 1 && (
                                <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {txn.items.length} items
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${modeInfo.badge}`}
                          >
                            <ModeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{modeInfo.name}</span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-extrabold text-sm sm:text-base ${
                              txn.payment_status === "credit"
                                ? "text-amber-700"
                                : txn.transaction_type === "payment"
                                ? "text-purple-700"
                                : "text-emerald-700"
                            }`}
                          >
                            ₹{txn.total_amount?.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {txn.payment_status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Paid (चुकता)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Udhaar (बाकी)</span>
                            </span>
                          )}
                        </td>

                        {/* Person's Net Khata Balance */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {customerBalance > 0 ? (
                            <span className="font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                              ₹{customerBalance.toLocaleString("en-IN")} बाकी
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              चुकता (Nil)
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="View full record details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {onEditTransaction && (
                              <button
                                onClick={() => onEditTransaction(txn)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Edit this record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PERSONS KHATA DIRECTORY TABLE */}
      {viewMode === "persons" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                All Persons in Khata Directory ({customerSummaries.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Summary record for every person with all items bought, payments made, and current Udhaar balance.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 self-start">
              Simple Khata Record
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400">#</th>
                  <th className="py-3.5 px-4">Person Name (व्यक्ति)</th>
                  <th className="py-3.5 px-4">Items Frequently Bought</th>
                  <th className="py-3.5 px-4 text-center">Total Entries</th>
                  <th className="py-3.5 px-4 text-right">Total Bought (₹)</th>
                  <th className="py-3.5 px-4 text-right">Total Paid (₹)</th>
                  <th className="py-3.5 px-4 text-right">Pending Udhaar (बाकी)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No persons recorded in Khata yet.
                    </td>
                  </tr>
                ) : (
                  customerSummaries.map((person, idx) => {
                    // Gather distinct items bought by this person
                    const personTxns = transactions.filter(
                      (t) => t.customer_name?.trim().toLowerCase() === person.name.trim().toLowerCase()
                    );
                    const distinctItems = Array.from(
                      new Set(
                        personTxns
                          .flatMap((t) => (t.items ? t.items.map((i) => i.name) : []))
                          .filter(Boolean)
                      )
                    );

                    return (
                      <tr key={person.name} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                              {person.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{person.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Last visit:{" "}
                                {person.lastTransactionDate
                                  ? new Date(person.lastTransactionDate).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Items Frequently Bought */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {distinctItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {distinctItems.slice(0, 3).map((item) => (
                                <span
                                  key={item}
                                  className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                                >
                                  {item}
                                </span>
                              ))}
                              {distinctItems.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-bold self-center">
                                  +{distinctItems.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              Payment entries only
                            </span>
                          )}
                        </td>

                        {/* Total Entries */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {person.totalTransactionsCount}
                        </td>

                        {/* Total Bought */}
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                          ₹{(person.totalCreditSales + person.totalPaidSales).toLocaleString("en-IN")}
                        </td>

                        {/* Total Paid */}
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          ₹{person.totalPaid.toLocaleString("en-IN")}
                        </td>

                        {/* Pending Udhaar */}
                        <td className="py-3.5 px-4 text-right font-extrabold">
                          {person.totalOwed > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              ₹{person.totalOwed.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                              ₹0 (चुकता)
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {person.totalOwed > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Udhaar Pending</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>Cleared</span>
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCustomer(person.name);
                              setViewMode("records");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition cursor-pointer"
                          >
                            <span>View Entries</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTxn && (
        <div
          id="table-detail-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Khata Entry Record
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTxn.customer_name || "Walk-in Customer"}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedTxn.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at {selectedTxn.time || "—"}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Amount Recorded
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  ₹{selectedTxn.total_amount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Payment Mode
                </span>
                <span
                  className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-md border ${
                    getPaymentModeInfo(selectedTxn).badge
                  }`}
                >
                  {getPaymentModeInfo(selectedTxn).name}
                </span>
              </div>
            </div>

            {/* Items Bought Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Items Bought / Transacted
              </h4>
              {selectedTxn.transaction_type === "payment" ? (
                <div className="p-3 bg-purple-50 text-purple-800 rounded-xl text-xs font-medium border border-purple-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    Udhaar Settlement: Payment of ₹
                    {selectedTxn.total_amount?.toLocaleString("en-IN")} received against prior
                    balance.
                  </span>
                </div>
              ) : selectedTxn.items && selectedTxn.items.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {selectedTxn.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="text-slate-500 ml-2">
                          Qty: {item.quantity} × ₹{item.unit_price}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(item.quantity * item.unit_price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                  {selectedTxn.notes || "General grocery purchases"}
                </div>
              )}
            </div>

            {/* Notes & Customer Outstanding */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">Customer's Overall Pending Udhaar:</span>
                <span className="font-extrabold text-amber-800 ml-1.5 text-sm">
                  ₹
                  {(
                    customerBalances[selectedTxn.customer_name?.trim().toLowerCase()] ?? 0
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              {selectedTxn.customer_name && onSelectCustomer && (
                <button
                  onClick={() => {
                    onSelectCustomer(selectedTxn.customer_name);
                    setSelectedTxn(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  View Khata Profile
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
              {onEditTransaction && (
                <button
                  onClick={() => {
                    const t = selectedTxn;
                    setSelectedTxn(null);
                    onEditTransaction(t);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Edit Transaction
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

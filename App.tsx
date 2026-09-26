/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Mic,
  LayoutDashboard,
  BookOpen,
  Users,
  Package,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  Globe,
  CheckCircle2,
  Menu,
  X,
  PlusCircle,
  Table as TableIcon,
} from "lucide-react";
import {
  Transaction,
  InventoryItem,
  ShopSettings,
  ExtractionResult,
  Language,
} from "./types";
import {
  getStoredTransactions,
  saveTransaction,
  updateTransaction,
  deleteTransaction,
  getStoredInventory,
  getStoredSettings,
  LEDGER_UPDATE_EVENT,
} from "./utils/storage";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { DashboardView } from "./components/DashboardView";
import { LedgerView } from "./components/LedgerView";
import { TableView } from "./components/TableView";
import { CustomersView } from "./components/CustomersView";
import { InventoryView } from "./components/InventoryView";
import { AskLedgerView } from "./components/AskLedgerView";
import { ReportsView } from "./components/ReportsView";
import { SettingsView } from "./components/SettingsView";
import { ReviewModal } from "./components/ReviewModal";
import { AIAgentAvatar } from "./components/AIAgentAvatar";
import { getTranslation } from "./utils/i18n";

type TabKey =
  | "voice"
  | "dashboard"
  | "ledger"
  | "table"
  | "customers"
  | "inventory"
  | "ask"
  | "reports"
  | "settings";

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>("voice");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(getStoredSettings());
  const [language, setLanguage] = useState<Language>(
    settings.defaultLanguage || settings.preferredLanguage || "en"
  );

  // Review modal state
  const [pendingReview, setPendingReview] = useState<ExtractionResult | null>(null);

  // Edit transaction modal in ledger
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Success toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customer filter transfer
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Header search state
  const [headerQuery, setHeaderQuery] = useState("");

  const lowStockCount = inventory.filter((i) => i.currentQuantity <= i.lowStockThreshold).length;
  const ownerInitials = settings.ownerName
    ? settings.ownerName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "JS";

  // Reload state from local storage
  const reloadData = () => {
    setTransactions(getStoredTransactions());
    setInventory(getStoredInventory());
    const storedSettings = getStoredSettings();
    setSettings(storedSettings);
    const activeLang = storedSettings.defaultLanguage || storedSettings.preferredLanguage;
    if (activeLang && activeLang !== language) {
      setLanguage(activeLang);
    }
  };

  useEffect(() => {
    reloadData();

    const handleStorageUpdate = () => {
      reloadData();
    };

    window.addEventListener(LEDGER_UPDATE_EVENT, handleStorageUpdate);
    return () => {
      window.removeEventListener(LEDGER_UPDATE_EVENT, handleStorageUpdate);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Called when voice/manual input extracts transaction details
  const handleTransactionExtracted = (extracted: ExtractionResult) => {
    setPendingReview(extracted);
  };

  // When vendor confirms saving in ReviewModal
  const handleConfirmSave = (finalData: ExtractionResult) => {
    saveTransaction({
      customer_name: finalData.customer_name,
      items: finalData.items,
      total_amount: finalData.total_amount,
      payment_status: finalData.payment_status,
      transaction_type: finalData.transaction_type,
      notes: finalData.notes,
      source: finalData.source || "voice",
      date: (finalData as any).date,
    });

    setPendingReview(null);
    triggerToast(
      `✓ Transaction with ${finalData.customer_name} (₹${finalData.total_amount}) saved to ledger!`
    );
  };

  // Ledger actions
  const handleDeleteTxn = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      deleteTransaction(id);
      triggerToast("Transaction deleted.");
    }
  };

  const handleUpdateTxn = (updated: Transaction) => {
    updateTransaction(updated);
    setEditingTransaction(null);
    triggerToast("Transaction updated.");
  };

  const navItems = [
    { key: "voice" as TabKey, label: "Voice Ledger", icon: Mic, badge: "AI" },
    { key: "dashboard" as TabKey, label: "Dashboard", icon: LayoutDashboard },
    { key: "table" as TabKey, label: "Table View", icon: TableIcon, badge: "New" },
    { key: "ledger" as TabKey, label: "Ledger", icon: BookOpen },
    { key: "customers" as TabKey, label: "Udhaar Khata", icon: Users },
    { key: "inventory" as TabKey, label: "Inventory", icon: Package },
    { key: "ask" as TabKey, label: "Ask AI", icon: Sparkles },
    { key: "reports" as TabKey, label: "Reports", icon: BarChart3 },
    { key: "settings" as TabKey, label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className="fixed top-4 right-4 z-50 flex items-center space-x-2.5 px-4 py-3 bg-[#0F172A] text-white rounded-xl shadow-xl border border-slate-700 text-xs font-semibold animate-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Review Transaction Modal */}
      {pendingReview && (
        <ReviewModal
          data={pendingReview}
          onSave={handleConfirmSave}
          onCancel={() => setPendingReview(null)}
        />
      )}

      {/* Edit Transaction Modal (from Ledger) */}
      {editingTransaction && (
        <ReviewModal
          data={{
            customer_name: editingTransaction.customer_name,
            items: editingTransaction.items,
            total_amount: editingTransaction.total_amount,
            payment_status: editingTransaction.payment_status,
            transaction_type: editingTransaction.transaction_type,
            notes: editingTransaction.notes,
            confidence: 95,
            source: editingTransaction.source,
          }}
          onSave={(finalData) => {
            handleUpdateTxn({
              ...editingTransaction,
              customer_name: finalData.customer_name,
              items: finalData.items,
              total_amount: finalData.total_amount,
              payment_status: finalData.payment_status,
              transaction_type: finalData.transaction_type,
              notes: finalData.notes,
            });
          }}
          onCancel={() => setEditingTransaction(null)}
        />
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] text-white border-r border-slate-800 shrink-0 min-h-screen justify-between sticky top-0 h-screen select-none">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-700/80">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-sm shrink-0">
              VL
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg leading-tight text-white tracking-tight truncate">
                VoiceLedger
              </h1>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase truncate mt-0.5">
                The Future of Khata
              </p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  id={`nav-item-${item.key}`}
                  onClick={() => setCurrentTab(item.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {item.key === "ask" ? (
                      <AIAgentAvatar size="xs" showStatusDot={true} className="shrink-0" />
                    ) : (
                      <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Shop Info & Language Switcher */}
        <div className="p-4 border-t border-slate-700/80 space-y-3">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider font-semibold">Shop Name</p>
            <p className="text-sm font-bold text-white truncate">{settings.shopName || "Sharma Kirana Store"}</p>
            <p className="text-[11px] text-slate-400 truncate mb-3">{settings.ownerName}</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLanguage("hi")}
                className={`flex-1 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
                  language === "hi"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLanguage("mr")}
                className={`flex-1 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
                  language === "mr"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                }`}
              >
                मराठी
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
                  language === "en"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab("voice")}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-200" />
            <span>Speak New Entry</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER WITH TOP HEADER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* DESKTOP TOP HEADER (Geometric Balance Style) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shrink-0 sticky top-0 z-20">
          <div className="flex-1 max-w-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (headerQuery.trim()) {
                  setCustomerFilter(headerQuery.trim());
                  setCurrentTab("ask");
                }
              }}
              className="relative"
            >
              <input
                type="text"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder='Ask your ledger: "Who owes me more than ₹500?"'
                className="w-full bg-slate-100 border-none rounded-full pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 focus:outline-none transition font-medium"
              />
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
            </form>
          </div>

          <div className="flex items-center gap-4 ml-8">
            {lowStockCount > 0 ? (
              <button
                onClick={() => setCurrentTab("inventory")}
                className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
              >
                <span>⚠ {lowStockCount} Low Stock Items</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-200 text-xs font-medium">
                <span>✓ Stock Healthy</span>
              </div>
            )}
            <div
              title={settings.ownerName || "Shopkeeper"}
              className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold ring-1 ring-slate-300 select-none"
            >
              {ownerInitials}
            </div>
          </div>
        </header>

        {/* MOBILE TOP BAR */}
        <header className="md:hidden bg-[#0F172A] text-white border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              VL
            </div>
            <div>
              <span className="font-bold text-white text-base leading-none block">VoiceLedger</span>
              <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">
                {settings.shopName || "Shop"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language toggle pill on mobile */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-[11px] font-bold">
              <button
                onClick={() => setLanguage("en")}
                className={`px-1.5 py-0.5 rounded ${
                  language === "en" ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`px-1.5 py-0.5 rounded ${
                  language === "hi" ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                हिं
              </button>
              <button
                onClick={() => setLanguage("mr")}
                className={`px-1.5 py-0.5 rounded ${
                  language === "mr" ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                मर
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[57px] bottom-16 bg-[#0F172A]/95 backdrop-blur-md z-30 p-4 border-b border-slate-800 overflow-y-auto">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl text-left flex items-center space-x-2.5 font-bold text-xs ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* MAIN CONTENT WORKSPACE */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full mb-16 md:mb-0">
        {currentTab === "voice" && (
          <VoiceRecorder
            language={language}
            onTransactionExtracted={handleTransactionExtracted}
            onViewDashboard={() => setCurrentTab("dashboard")}
          />
        )}

        {currentTab === "dashboard" && (
          <DashboardView
            transactions={transactions}
            inventory={inventory}
            settings={settings}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectCustomer={(cName) => {
              setCustomerFilter(cName);
              setCurrentTab("customers");
            }}
          />
        )}

        {currentTab === "table" && (
          <TableView
            transactions={transactions}
            onEditTransaction={(txn) => setEditingTransaction(txn)}
            onSelectCustomer={(cName) => {
              setCustomerFilter(cName);
              setCurrentTab("customers");
            }}
          />
        )}

        {currentTab === "ledger" && (
          <LedgerView
            transactions={transactions}
            onEditTransaction={(txn) => setEditingTransaction(txn)}
            onDeleteTransaction={handleDeleteTxn}
            onAddNewVoice={() => setCurrentTab("voice")}
            initialCustomerFilter={customerFilter || undefined}
          />
        )}

        {currentTab === "customers" && (
          <CustomersView
            transactions={transactions}
            preselectedCustomer={customerFilter}
            onOpenLedgerForCustomer={(cName) => {
              setCustomerFilter(cName);
              setCurrentTab("ledger");
            }}
            onRecordNewForCustomer={(cName) => {
              setPendingReview({
                customer_name: cName,
                items: [{ name: "General Goods", quantity: 1, unit_price: 100 }],
                total_amount: 100,
                payment_status: "credit",
                transaction_type: "sale",
                notes: "",
                source: "manual",
              });
            }}
            onOpenAddTransaction={(cName, defaultType) => {
              const isPmt = defaultType === "payment";
              setPendingReview({
                customer_name: cName || "",
                items: isPmt
                  ? [{ name: "Udhaar Settlement / जमा", quantity: 1, unit_price: 100 }]
                  : [{ name: "General Goods", quantity: 1, unit_price: 100 }],
                total_amount: 100,
                payment_status: isPmt ? "paid" : "credit",
                transaction_type: defaultType || "sale",
                notes: isPmt ? "Payment received for previous Udhaar" : "",
                source: "manual",
              });
            }}
          />
        )}

        {currentTab === "inventory" && <InventoryView inventory={inventory} />}

        {currentTab === "ask" && (
          <AskLedgerView
            transactions={transactions}
            onOpenLedgerWithFilter={(q) => {
              setCustomerFilter(q);
              setCurrentTab("ledger");
            }}
          />
        )}

        {currentTab === "reports" && (
          <ReportsView transactions={transactions} inventory={inventory} />
        )}

        {currentTab === "settings" && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            onResetData={() => reloadData()}
          />
        )}
      </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-3 py-2 z-40 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentTab("voice")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "voice" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              currentTab === "voice" ? "bg-indigo-50 text-indigo-600" : ""
            }`}
          >
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5">Voice</span>
        </button>

        <button
          onClick={() => setCurrentTab("dashboard")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "dashboard" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          id="mobile-bottom-table-btn"
          onClick={() => setCurrentTab("table")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "table" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <TableIcon className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Table</span>
        </button>

        <button
          onClick={() => setCurrentTab("ledger")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "ledger" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Ledger</span>
        </button>

        <button
          onClick={() => setCurrentTab("customers")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "customers" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Udhaar</span>
        </button>

        <button
          onClick={() => setCurrentTab("ask")}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            currentTab === "ask" ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"
          }`}
        >
          <AIAgentAvatar size="xs" showStatusDot={currentTab === "ask"} />
          <span className="text-[10px] mt-0.5">Ask AI</span>
        </button>
      </nav>
    </div>
  );
}

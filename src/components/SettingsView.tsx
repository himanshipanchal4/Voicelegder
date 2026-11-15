import { useState, FormEvent } from "react";
import {
  Settings as SettingsIcon,
  Store,
  User,
  Globe,
  Bell,
  Download,
  RotateCcw,
  CheckCircle2,
  Save,
  Trash2,
} from "lucide-react";
import { ShopSettings, Language } from "../types";
import {
  saveStoredSettings,
  resetToDemoData,
  clearAllTransactions,
  resetAppAndData,
  exportTransactionsToCSV,
} from "../utils/storage";

interface SettingsViewProps {
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
}

export function SettingsView({ settings, onUpdateSettings, onResetData }: SettingsViewProps) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(
    settings.defaultLanguage || settings.preferredLanguage || "en"
  );
  const [currencySymbol, setCurrencySymbol] = useState(
    settings.currencySymbol || settings.currency || "₹"
  );
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useState(settings.lowStockAlertsEnabled);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const updated: ShopSettings = {
      shopName: shopName.trim() || "Sharma Kirana Store",
      ownerName: ownerName.trim() || "Ramesh Sharma",
      currencySymbol,
      currency: currencySymbol,
      defaultLanguage,
      preferredLanguage: defaultLanguage,
      lowStockAlertsEnabled,
    };
    saveStoredSettings(updated);
    onUpdateSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all transaction data? This will clear all ledger entries and customer balances, giving you a completely clean slate."
      )
    ) {
      clearAllTransactions();
      onResetData();
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }
  };

  const handleResetConfirm = () => {
    if (
      window.confirm(
        "Are you sure you want to load sample demo transactions? This will populate the ledger with sample customer sales and udhaar for testing."
      )
    ) {
      resetToDemoData();
      onResetData();
      alert("Sample demo data loaded!");
    }
  };

  return (
    <div id="settings-page" className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop Settings</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Customize shop identity, regional language preference, and alert options
        </p>
      </div>

      {showSavedToast && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <Store className="w-4 h-4 text-slate-400" />
            <span>Shop Name</span>
          </label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Sharma Kirana & General Store"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <span>Owner Name</span>
          </label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Ramesh Sharma"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Default Language</span>
            </label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as Language)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">English (Indian)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Currency Symbol
            </label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Toggle alerts */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-5 h-5 text-amber-600" />
            <div>
              <span className="font-bold text-sm text-slate-900 block">Low-Stock Alerts</span>
              <span className="text-xs text-slate-400">
                Show warning alerts on dashboard when inventory items drop below threshold
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockAlertsEnabled}
              onChange={(e) => setLowStockAlertsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Data Operations Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900">Data Management & Reset</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Clear records to start clean, export backups, or load sample entries for testing
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleClearAllData}
            className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center space-x-2 border border-rose-200 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete All Data</span>
          </button>

          <button
            type="button"
            onClick={exportTransactionsToCSV}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleResetConfirm}
            className="py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center space-x-2 border border-indigo-200 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <span>Load Sample Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}

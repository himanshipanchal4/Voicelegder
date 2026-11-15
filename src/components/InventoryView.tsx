import { useState, FormEvent } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  TrendingDown,
  RefreshCw,
  X,
  Save,
} from "lucide-react";
import { InventoryItem } from "../types";
import { updateInventoryItem, addInventoryItem } from "../utils/storage";

interface InventoryViewProps {
  inventory: InventoryItem[];
}

export function InventoryView({ inventory }: InventoryViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // New item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(10);
  const [newItemUnit, setNewItemUnit] = useState("kg");
  const [newItemThreshold, setNewItemThreshold] = useState(5);

  const lowStockCount = inventory.filter((i) => i.currentQuantity <= i.lowStockThreshold).length;

  const handleAdjustQuantity = (item: InventoryItem, delta: number) => {
    const updatedQty = Math.max(0, item.currentQuantity + delta);
    updateInventoryItem({
      ...item,
      currentQuantity: updatedQty,
    });
  };

  const handleCreateItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addInventoryItem({
      name: newItemName.trim(),
      currentQuantity: Number(newItemQty),
      unit: newItemUnit.trim() || "kg",
      lowStockThreshold: Number(newItemThreshold) || 5,
    });

    setNewItemName("");
    setNewItemQty(10);
    setNewItemThreshold(5);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateInventoryItem(editingItem);
    setEditingItem(null);
  };

  return (
    <div id="inventory-page" className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Inventory & Low-Stock Alerts (स्टॉक)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage essential grocery stock. Automatically alerts you when items run below threshold.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{lowStockCount} Items Low Stock</span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Low Stock Highlight Alert Box */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>LOW STOCK ALERTS REQUIRING ATTENTION:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {inventory
              .filter((i) => i.currentQuantity <= i.lowStockThreshold)
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between shadow-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-amber-700 font-bold">
                      {item.name.split(" ")[0]} is running low — only {item.currentQuantity} {item.unit} remaining
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdjustQuantity(item, 10)}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px] cursor-pointer"
                  >
                    +10 Restock
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Inventory Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item) => {
          const isLow = item.currentQuantity <= item.lowStockThreshold;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white border transition-all shadow-xs ${
                isLow ? "border-amber-300" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{item.name}</h3>
                  <span className="text-[11px] text-slate-400">Updated {item.lastUpdated}</span>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    isLow
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-green-100 text-green-800 border border-green-200"
                  }`}
                >
                  {isLow ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Low Stock
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                      In Stock
                    </>
                  )}
                </span>
              </div>

              {/* Quantity Meter */}
              <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Current Quantity
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-slate-900">{item.currentQuantity}</span>
                    <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Alert Below</span>
                  <span className="font-bold text-slate-700">
                    {item.lowStockThreshold} {item.unit}
                  </span>
                </div>
              </div>

              {/* Quick Adjustment Controls */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleAdjustQuantity(item, -1)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center transition cursor-pointer"
                    title="Deduct 1"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleAdjustQuantity(item, 1)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center transition cursor-pointer"
                    title="Add 1"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleAdjustQuantity(item, 5)}
                    className="px-2.5 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                    title="Add 5"
                  >
                    +5
                  </button>
                </div>

                <button
                  onClick={() => setEditingItem(item)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  title="Edit Threshold / Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Add Inventory Item</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Basmati Rice, Mustard Oil, Maggi"
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="litres">litres</option>
                    <option value="bottles">bottles</option>
                    <option value="packets">packets</option>
                    <option value="sacks">sacks</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Low-Stock Threshold (Alert when below)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newItemThreshold}
                  onChange={(e) => setNewItemThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl border-slate-300 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">Edit {editingItem.name}</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.currentQuantity}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, currentQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Low-Stock Alert Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={editingItem.lowStockThreshold}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, lowStockThreshold: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border rounded-xl border-slate-300 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

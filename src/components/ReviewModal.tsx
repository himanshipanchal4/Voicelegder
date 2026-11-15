import { useState } from "react";
import { ExtractionResult, PaymentStatus, TransactionType } from "../types";
import { CheckCircle2, AlertTriangle, AlertCircle, Edit3, Save, X, Plus, Trash2, Calendar } from "lucide-react";

interface ReviewModalProps {
  data: ExtractionResult & { isNewManual?: boolean; date?: string };
  onSave: (finalData: ExtractionResult & { date?: string }) => void;
  onCancel: () => void;
}

export function ReviewModal({ data, onSave, onCancel }: ReviewModalProps) {
  const [customerName, setCustomerName] = useState(data.customer_name || "Walk-in Customer");
  const [totalAmount, setTotalAmount] = useState<number>(data.total_amount || 0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(data.payment_status || "paid");
  const [transactionType, setTransactionType] = useState<TransactionType>(data.transaction_type || "sale");
  const [txnDate, setTxnDate] = useState<string>(data.date || new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState(
    data.items && data.items.length > 0
      ? data.items
      : [{ name: "Grocery items", quantity: 1, unit_price: data.total_amount || 0 }]
  );
  const [notes, setNotes] = useState(
    data.notes || (data.transaction_type === "payment" ? "Payment received for previous Udhaar" : "")
  );
  const [isEditing, setIsEditing] = useState(Boolean(data.isNewManual));

  const isPayment = transactionType === "payment";

  const confidence = data.confidence || (data.isNewManual ? 100 : 85);

  let confidenceBadge = {
    color: "bg-green-50 text-green-700 border-green-200",
    text: "High confidence",
    icon: CheckCircle2,
  };
  if (confidence < 70) {
    confidenceBadge = {
      color: "bg-amber-50 text-amber-700 border-amber-200",
      text: "Needs review",
      icon: AlertCircle,
    };
  } else if (confidence < 90) {
    confidenceBadge = {
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      text: "Medium confidence",
      icon: AlertTriangle,
    };
  }

  const handleAddItem = () => {
    setItems([...items, { name: "Item " + (items.length + 1), quantity: 1, unit_price: 50 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      recalcTotal(updated);
    }
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
    if (field === "unit_price" || field === "quantity") {
      recalcTotal(updated);
    }
  };

  const recalcTotal = (list: typeof items) => {
    const sum = list.reduce((acc, itm) => acc + Number(itm.quantity || 1) * Number(itm.unit_price || 0), 0);
    if (sum > 0) setTotalAmount(sum);
  };

  const handleSelectType = (type: "sale_paid" | "sale_credit" | "payment" | "purchase") => {
    if (type === "sale_paid") {
      setTransactionType("sale");
      setPaymentStatus("paid");
    } else if (type === "sale_credit") {
      setTransactionType("sale");
      setPaymentStatus("credit");
    } else if (type === "payment") {
      setTransactionType("payment");
      setPaymentStatus("paid");
      if (!notes) {
        setNotes("Payment received for previous Udhaar");
      }
    } else if (type === "purchase") {
      setTransactionType("purchase");
      setPaymentStatus("paid");
    }
  };

  const handleSave = () => {
    const finalAmount = Number(totalAmount) || 0;
    const finalItems = isPayment
      ? [{ name: "Udhaar Settlement / जमा", quantity: 1, unit_price: finalAmount }]
      : items;

    onSave({
      customer_name: customerName.trim() || "Walk-in Customer",
      items: finalItems,
      total_amount: finalAmount,
      payment_status: isPayment ? "paid" : paymentStatus,
      transaction_type: transactionType,
      date: txnDate,
      notes: notes.trim(),
      confidence,
      source: data.source || (data.isNewManual ? "manual" : "voice"),
    });
  };

  return (
    <div
      id="review-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div
        id="review-transaction-card"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
      >
        {/* Card Header (Geometric Balance Dark Slate with Indigo) */}
        <div className="bg-[#0F172A] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-white">Transaction Detected</h3>
              <p className="text-xs text-slate-400">Review and confirm before saving</p>
            </div>
          </div>
          <button
            id="close-review-modal-btn"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Confidence Indicator */}
        <div className="px-6 pt-3.5 pb-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-600">AI Confidence:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-semibold ${confidenceBadge.color}`}>
              <confidenceBadge.icon className="w-3.5 h-3.5 mr-1" />
              {confidence}% — {confidenceBadge.text}
            </span>
          </div>
          <button
            id="toggle-edit-mode-btn"
            onClick={() => setIsEditing(!isEditing)}
            className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? "Done Editing" : "Edit Fields"}</span>
          </button>
        </div>

        {confidence < 70 && (
          <div className="mx-6 mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Please review the highlighted fields before saving.</span>
          </div>
        )}

        {/* Card Body */}
        <div className="p-6 space-y-4 text-sm text-slate-700 max-h-[60vh] overflow-y-auto">
          {/* Transaction Type Selector (4 Types) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Transaction Type (लेन-देन का प्रकार)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSelectType("sale_paid")}
                className={`py-2 px-2 text-xs rounded-lg font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  transactionType === "sale" && paymentStatus === "paid"
                    ? "bg-white shadow-xs text-indigo-700 border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🛒</span>
                <span>Sale</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectType("sale_credit")}
                className={`py-2 px-2 text-xs rounded-lg font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  transactionType === "sale" && paymentStatus === "credit"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>💳</span>
                <span>Udhaar Sale</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectType("payment")}
                className={`py-2 px-2 text-xs rounded-lg font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  transactionType === "payment"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>💰</span>
                <span>Payment</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectType("purchase")}
                className={`py-2 px-2 text-xs rounded-lg font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  transactionType === "purchase"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📦</span>
                <span>Purchase</span>
              </button>
            </div>
          </div>

          {/* If Payment Received is selected */}
          {isPayment ? (
            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-medium flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Payment received against previous Udhaar. This will decrease the customer's pending balance.</span>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  id="payment-customer-name-input"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 text-sm"
                  placeholder="e.g. Himanshi, Sharma, Ramesh..."
                />
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      id="payment-amount-input"
                      type="number"
                      required
                      min="1"
                      value={totalAmount || ""}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border rounded-xl border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-900 text-base"
                      placeholder="e.g. 200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    id="payment-date-input"
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  id="payment-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Payment received for previous Udhaar"
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-sm"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Customer / Vendor Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {transactionType === "purchase" ? "Supplier / Vendor" : "Customer Name"}
                </label>
                {isEditing ? (
                  <input
                    id="edit-customer-input"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    placeholder="e.g. Sharma, Ramesh, Priya..."
                  />
                ) : (
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-900">
                    <span>{customerName}</span>
                    <span className="text-xs text-slate-400">
                      {transactionType === "purchase" ? "Vendor" : "Customer"}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount & Date / Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                      <input
                        id="edit-amount-input"
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                      />
                    </div>
                  ) : (
                    <div className="py-2 px-3 bg-indigo-50/70 rounded-xl border border-indigo-200/80 font-extrabold text-indigo-900 text-lg">
                      ₹{Number(totalAmount).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  {isEditing ? (
                    <div className="flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("paid")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          paymentStatus === "paid"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("credit")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          paymentStatus === "credit"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        Udhaar
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-xl border border-slate-200 font-bold flex items-center space-x-1.5">
                      {paymentStatus === "credit" ? (
                        <span className="text-rose-600 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block mr-1.5 animate-pulse"></span>
                          Udhaar (Credit)
                        </span>
                      ) : (
                        <span className="text-indigo-700 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block mr-1.5"></span>
                          Paid (नकद)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Items ({items.length})
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {items.map((itm, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={itm.name}
                            onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                            className="flex-2 px-2.5 py-1.5 border rounded-lg border-slate-300 bg-white"
                            placeholder="Item name"
                          />
                          <input
                            type="number"
                            min="1"
                            value={itm.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border rounded-lg border-slate-300 bg-white text-center"
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            min="0"
                            value={itm.unit_price}
                            onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                            className="w-20 px-2 py-1.5 border rounded-lg border-slate-300 bg-white text-right"
                            placeholder="Price"
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between py-1 border-b border-slate-100 last:border-none">
                          <span className="font-medium text-slate-800">{itm.name}</span>
                          <div className="text-slate-500">
                            <span>x{itm.quantity}</span>
                            <span className="ml-3 font-semibold text-slate-800">
                              ₹{(itm.quantity * itm.unit_price).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Notes / Original Voice Text
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. customer note or item details"
                    className="w-full px-3 py-2 border rounded-xl border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : notes ? (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 italic">
                    “{notes}”
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between space-x-3">
          <button
            id="cancel-review-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                id="edit-transaction-btn"
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              id="confirm-save-transaction-btn"
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-2 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Transaction</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

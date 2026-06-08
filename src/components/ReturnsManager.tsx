/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { ArrowLeftRight, Trash, Check, HelpCircle } from "lucide-react";

export const ReturnsManager: React.FC = () => {
  const { items, returns, addReturn, sales, purchases } = useInventory();

  // Return Form States
  const [returnType, setReturnType] = useState<"sale" | "purchase">("sale");
  const [referenceInvoice, setReferenceInvoice] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Damaged Inner Defect");
  const [actionType, setActionType] = useState<"Refund" | "Exchange">("Refund");
  
  const [feedback, setFeedback] = useState("");

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      setFeedback("Error: Please select a cosmetic product.");
      return;
    }
    if (!referenceInvoice.trim()) {
      setFeedback("Error: Invoice Reference code is required.");
      return;
    }

    const itemObj = items.find(i => i.id === itemId);
    if (!itemObj) return;

    // Call addReturn from Context! This is amazing, Context supports return ledgers
    addReturn({
      type: returnType,
      invoiceNumber: referenceInvoice.trim().toUpperCase(),
      itemId,
      sku: itemObj.sku,
      name: itemObj.name,
      quantity,
      reason: `${reason} (${actionType})`,
      refundAmount: Math.round((itemObj.costPrice || 100) * (returnType === "sale" ? 1.35 : 1) * quantity),
      action: actionType,
      returnDate: new Date().toISOString().substring(0, 10),
      operator: "Manager Returns Desk"
    }, "Manager Principal");

    setReferenceInvoice("");
    setItemId("");
    setQuantity(1);
    setReason("Damaged Inner Defect");
    setFeedback("✓ Return logged successfully! Stock adjustments synchronized.");
    setTimeout(() => setFeedback(""), 3500);
  };

  return (
    <div className="space-y-4">
      {/* RECORD RETURN FORM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-bold text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          🔄 Reverse Logistics & Returns Desk
        </h4>

        <form onSubmit={handleSubmitReturn} className="space-y-3 font-mono text-[9px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-0.5">RETURN DIRECTION</label>
              <select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as "sale" | "purchase")}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-100 text-[10px]"
              >
                <option value="sale">CUSTOMER RETURN (RESTORES STOCK +)</option>
                <option value="purchase">SUPPLIER RETURN (DEDUCTS STOCK -)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5">REFERENCE INVOICE BILL *</label>
              <input
                type="text"
                placeholder="SDV-SL-829 OR SUP-90"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 uppercase text-[10px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-slate-500 block mb-0.5 font-bold">SELECT AFFECTED COSMETIC PRODUCT *</label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 font-sans text-[10px]"
                required
              >
                <option value="">-- Choose Product --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-0.5">RETURNED QUANTITY *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-150 text-[10px]"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5">RECONCILIATION ACTION</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as "Refund" | "Exchange")}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-150 text-[10px]"
              >
                <option value="Refund">CASH REFUND PAID</option>
                <option value="Exchange">PRODUCT EXCHANGE OFFERED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-0.5">REASON FOR RETURN</label>
            <input
              type="text"
              placeholder="e.g. Broken nozzle, customer mismatch, expired, color incorrect..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>

          {feedback && (
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono leading-relaxed">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition uppercase"
          >
            Post Return stock adjustment
          </button>
        </form>
      </div>

      {/* RETURN LOG ARCHIVE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">
          📜 ACTIVE RETURN TRANSACTION JOURNAL
        </span>

        <p className="text-[7.5px] text-slate-500 font-mono uppercase mb-2">
          Note: Customer returns add to inventory, supplier returns deduct.
        </p>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {returns.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-2 text-center">
              No returns registered in store archive
            </span>
          ) : (
            returns.slice().reverse().map((r) => (
              <div key={r.id} className="p-2 bg-slate-950 border border-slate-850 rounded flex flex-col gap-1 text-[8px] font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[7px] px-1 py-0.2 rounded font-bold uppercase mr-1.5 ${r.type === 'sale' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {r.type === 'sale' ? 'Customer Ret' : 'Supplier Ret'}
                    </span>
                    <strong className="text-slate-300">{r.name}</strong>
                    <p className="text-slate-500 mt-0.5">Inv Ref: #{r.invoiceNumber} • Date: {r.returnDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-slate-200">Qty: {r.quantity}</span>
                    <span className="text-slate-400 font-medium">Reconciled: ₹{r.refundAmount}</span>
                  </div>
                </div>

                <div className="text-[7.5px] text-slate-400 border-t border-slate-900/65 pt-1 flex justify-between uppercase">
                  <span>Recon: <strong>{r.action}</strong></span>
                  <span>Reason: <strong className="text-rose-400">{r.reason}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Purchase, PurchaseItem } from "../types";
import { Plus, Trash, Check, Loader2 } from "lucide-react";

export const PurchasesManager: React.FC = () => {
  const { items, suppliers, purchases, addPurchase } = useInventory();

  // Create Purchase states
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  
  // Multiple items list
  const [purchaseItems, setPurchaseItems] = useState<{
    itemId: string;
    quantity: number;
    rate: number;
    batchNumber: string;
    mfgDate: string;
    expiryDate: string;
  }[]>([
    { itemId: "", quantity: 1, rate: 100, batchNumber: "", mfgDate: "", expiryDate: "" }
  ]);

  const [feedback, setFeedback] = useState("");

  const handleAddItemRow = () => {
    setPurchaseItems([
      ...purchaseItems,
      { itemId: "", quantity: 1, rate: 100, batchNumber: "", mfgDate: "", expiryDate: "" }
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: string, value: any) => {
    const updated = [...purchaseItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setPurchaseItems(updated);
  };

  const handleCreatePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      setFeedback("Error: Please select a wholesale supplier.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setFeedback("Error: Invoice Number is required.");
      return;
    }

    const filtered = purchaseItems.filter(p => p.itemId !== "");
    if (filtered.length === 0) {
      setFeedback("Error: Please add at least one valid item.");
      return;
    }

    const matchedSupplierName = suppliers.find(s => s.id === supplierId)?.name || "Unknown Supplier";

    // Build purchase items array
    const cleanItems: PurchaseItem[] = filtered.map((p, idx) => {
      const itemObj = items.find(i => i.id === p.itemId)!;
      const totalCost = p.quantity * p.rate;
      
      const bNumber = p.batchNumber.trim() || `B-IN-${invoiceNumber}`;
      const mDate = p.mfgDate || new Date().toISOString().substring(0, 10);
      const eDate = p.expiryDate || new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().substring(0, 10); // + 2 Years

      return {
        id: `pi-${Date.now()}-${idx}`,
        itemId: p.itemId,
        sku: itemObj.sku,
        name: itemObj.name,
        quantity: p.quantity,
        rate: p.rate,
        batchNumber: bNumber,
        mfgDate: mDate,
        expiryDate: eDate,
        total: totalCost
      };
    });

    const subtotal = cleanItems.reduce((sum, item) => sum + item.total, 0);
    const gstAmt = Math.round(subtotal * 0.18); // 18% standard India GST on procurement
    const grand = Math.round(subtotal + gstAmt);

    addPurchase({
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      supplierId,
      supplierName: matchedSupplierName,
      purchaseDate,
      items: cleanItems,
      subtotal,
      gstAmount: gstAmt,
      grandTotal: grand,
      operator: "Manager Procure Terminal"
    }, "Manager Principal");

    // Clear Form
    setInvoiceNumber("");
    setSupplierId("");
    setPurchaseItems([{ itemId: "", quantity: 1, rate: 100, batchNumber: "", mfgDate: "", expiryDate: "" }]);
    setFeedback("✓ Supplier Purchase Recorded. Stock ledger positive adjustments posted!");
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-4">
      {/* PROCUREMENT CREATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-bold text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          📥 Record Supplier Purchase Invoice
        </h4>

        <form onSubmit={handleCreatePurchaseSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">SELECT WHOLESALE SUPPLIER *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-250 text-[10px] font-sans"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.gstin})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-50 relative top-[-10px] block mb-0.5 mt-2 text-[8px]">Or add a supplier first in the Supplier sub-tab</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">INVOICE NUMBER *</label>
              <input
                type="text"
                placeholder="SUP-INV-204"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 uppercase"
                required
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">PURCHASE DATE</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
                required
              />
            </div>
          </div>

          {/* PROCURED ITEMS LIST */}
          <div className="space-y-2 pt-1">
            <span className="text-[8px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
              WHOLESALE INVOICE ITEMS & MFG/EXP BATCH DETAILS:
            </span>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {purchaseItems.map((pi, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center text-[7.5px] font-mono text-pink-300 font-bold uppercase">
                    <span>Invoice Item Line #{idx + 1}</span>
                    {purchaseItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-450 hover:text-rose-400 cursor-pointer"
                      >
                        [REMOVE]
                      </button>
                    )}
                  </div>

                  <div className="text-[9px] font-sans">
                    <select
                      value={pi.itemId}
                      onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[8.5px] font-mono">
                    <div>
                      <label className="text-slate-500 block mb-0.5">QTY (UNITS) *</label>
                      <input
                        type="number"
                        min="1"
                        value={pi.quantity}
                        onChange={(e) => handleRowChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 font-bold text-emerald-400 text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">RATE (UNIT COST ₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={pi.rate}
                        onChange={(e) => handleRowChange(idx, "rate", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 font-bold text-center"
                        required
                      />
                    </div>
                  </div>

                  {/* BATCH NUMBER & EXPIRY TRACK */}
                  <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
                    <div>
                      <label className="text-slate-500 block mb-0.5">BATCH NO</label>
                      <input
                        type="text"
                        placeholder="LOT-A2"
                        value={pi.batchNumber}
                        onChange={(e) => handleRowChange(idx, "batchNumber", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">MFG DATE</label>
                      <input
                        type="date"
                        value={pi.mfgDate}
                        onChange={(e) => handleRowChange(idx, "mfgDate", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-0.5 py-0.5 text-[7px]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">EXP DATE</label>
                      <input
                        type="date"
                        value={pi.expiryDate}
                        onChange={(e) => handleRowChange(idx, "expiryDate", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-0.5 py-0.5 text-[7px] text-amber-300"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-[8px] font-mono text-slate-300 transition flex items-center gap-1 select-none cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-pink-500" /> [ADD ANOTHER PROCUREMENT SKU]
            </button>
          </div>

          {feedback && (
            <div className={`p-1.5 rounded text-[9px] font-mono leading-normal ${feedback.startsWith("Error") ? "bg-rose-500/15 border border-rose-500/20 text-rose-400" : "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"}`}>
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition shadow-xl uppercase animate-fade-in"
          >
            Submit Supplier Purchase Bill
          </button>
        </form>
      </div>

      {/* PURCHASES HISTORY */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">
          📜 SUPPLE RE-SUPPLY PROCUREMENT ARCHIVES
        </span>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {purchases.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-2 text-center">
              No procured invoices registered yet
            </span>
          ) : (
            purchases.slice().reverse().map((p) => (
              <div key={p.id} className="p-2 bg-slate-950 border border-slate-850 rounded flex flex-col gap-1 text-[8.5px] font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <strong className="text-slate-200">#{p.invoiceNumber}</strong>
                    <span className="text-slate-500 block text-[7.5px]">{p.purchaseDate} • Vendor: {p.supplierName}</span>
                  </div>
                  <span className="text-emerald-400 font-bold shrink-0">₹{p.grandTotal}</span>
                </div>

                <div className="border-t border-slate-900 pt-1 mt-0.5 text-[7px] text-slate-500 flex justify-between">
                  <span>Procured Line SKUs: {p.items.length}</span>
                  <span className="text-slate-400">GST 18% Code Applied</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

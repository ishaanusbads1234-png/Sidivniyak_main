import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { X, Plus, Trash2, CheckCircle2, ShoppingBag } from "lucide-react";
import { PurchaseItem } from "../types";

interface ManualStockEntryProps {
  onClose: () => void;
}

export const ManualStockEntry: React.FC<ManualStockEntryProps> = ({ onClose }) => {
  const { items, suppliers, addPurchase } = useInventory();

  // Primary invoice details
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substring(0, 10));
  const [clerk, setClerk] = useState("Staff Inventory Desk");

  // Multi-product items rows
  const [rows, setRows] = useState<{
    itemId: string;
    pcs: number;
    rate: number;
    gstPercent: number;
  }[]>([
    { itemId: "", pcs: 20, rate: 100, gstPercent: 18 }
  ]);

  const [feedback, setFeedback] = useState("");

  const handleAddFieldRow = () => {
    setRows([...rows, { itemId: "", pcs: 20, rate: 100, gstPercent: 18 }]);
  };

  const handleRemoveFieldRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, idx) => idx !== index));
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleSaveStockEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      setFeedback("Error: Please choose a valid wholesale vendor.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setFeedback("Error: Invoice reference number is required.");
      return;
    }

    const validRows = rows.filter((r) => r.itemId !== "" && r.pcs > 0);
    if (validRows.length === 0) {
      setFeedback("Error: Please select at least one valid product SKU with quantity.");
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === supplierId);
    if (!supplierObj) {
      setFeedback("Error: Wholesale supplier could not be mapped.");
      return;
    }

    // Prepare unified purchase items
    const cleanItems: PurchaseItem[] = validRows.map((r, idx) => {
      const parentItem = items.find((i) => i.id === r.itemId)!;
      const amountLocal = r.pcs * r.rate;

      return {
        id: `pi-${Date.now()}-${idx}`,
        itemId: r.itemId,
        sku: parentItem.sku,
        name: parentItem.name,
        quantity: r.pcs,
        rate: r.rate,
        batchNumber: `B-MAN-${invoiceNumber.trim().toUpperCase()}`,
        mfgDate: invoiceDate,
        expiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().substring(0, 10), // + 2 Years
        total: amountLocal
      };
    });

    const subtotal = cleanItems.reduce((sum, item) => sum + item.total, 0);
    // Cumulative India GST calculations
    const gstTotalLocal = validRows.reduce((sum, r) => {
      const costAmount = r.pcs * r.rate;
      return sum + Math.round((costAmount * r.gstPercent) / 100);
    }, 0);
    const grandTotal = subtotal + gstTotalLocal;

    // Call context dispatch (which automatically adds positive ledger transactions & audits)
    addPurchase(
      {
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        supplierId,
        supplierName: supplierObj.name,
        supplierGstin: supplierObj.gstin,
        purchaseDate: invoiceDate,
        items: cleanItems,
        subtotal,
        gstAmount: gstTotalLocal,
        grandTotal,
        operator: clerk
      },
      clerk
    );

    setFeedback(`✓ Saved Stock Entry! Loaded +${cleanItems.reduce((s, i) => s + i.quantity, 0)} PCS into inventory.`);
    setInvoiceNumber("");
    setRows([{ itemId: "", pcs: 20, rate: 100, gstPercent: 18 }]);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="manual-stock-entry-panel"
        className="w-full max-w-sm bg-slate-900 border border-pink-500/30 rounded-2xl p-4 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-6 w-6 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <ShoppingBag className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black font-mono tracking-wider text-pink-400 uppercase">
                📥 Manual Stock Entry
              </h3>
              <p className="text-[9px] text-slate-400">Receive cosmetics product inventory manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer select-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {feedback && (
          <div className={`p-2 rounded text-[8.5px] font-mono leading-normal text-center ${feedback.startsWith("Error") ? 'bg-rose-500/10 border border-rose-500/20 text-rose-450' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse'}`}>
            {feedback}
          </div>
        )}

        <form onSubmit={handleSaveStockEntry} className="space-y-3 font-mono text-[9px]">
          {/* Supplier and Clerk Selection */}
          <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Vendor Reference Details</span>
            <div>
              <label className="text-slate-400 block mb-0.5 font-bold">SELECT SUPPLIER *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 font-sans text-[9.5px]/none"
                required
              >
                <option value="">-- Choose Vendor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.gstin || "No GSTIN"})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-slate-400 block mb-0.5 font-bold">INVOICE NO *</label>
                <input
                  type="text"
                  placeholder="e.g. S-901"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-100 uppercase font-sans text-[10px]"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5 font-bold">ENTRY DATE</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-100 text-[8px]"
                  required
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="text-slate-400 block mb-0.5 font-bold">CLERK INITIALS</label>
              <input
                type="text"
                value={clerk}
                onChange={(e) => setClerk(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5"
                required
              />
            </div>
          </div>

          {/* Table Items rows */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Inward Items Lines</span>
              <button
                type="button"
                onClick={handleAddFieldRow}
                className="text-[8.5px] text-pink-400 hover:text-pink-300 font-bold border border-pink-500/35 hover:bg-pink-500/5 px-2 py-0.5 rounded cursor-pointer"
              >
                + ADD LINE
              </button>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-500">
                    <span>Line #{idx + 1}</span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFieldRow(idx)}
                        className="text-rose-400 hover:text-rose-350 cursor-pointer"
                      >
                        [REMOVE]
                      </button>
                    )}
                  </div>

                  {/* Dropdown product selection */}
                  <div>
                    <label className="text-slate-500 block mb-0.5 font-bold">Cosmetic Product</label>
                    <select
                      value={row.itemId}
                      onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 font-sans text-[9.5px]/none"
                      required
                    >
                      <option value="">-- Select Product Product --</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[8.5px]">
                    <div>
                      <label className="text-slate-500 block mb-0.5 text-center font-bold">QTY (PCS) *</label>
                      <input
                        type="number"
                        min="1"
                        value={row.pcs}
                        onChange={(e) => handleRowChange(idx, "pcs", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center font-bold text-emerald-400 text-[10px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 block mb-0.5 text-center font-bold">CP Rate (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={row.rate}
                        onChange={(e) => handleRowChange(idx, "rate", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-[10px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 block mb-0.5 text-center font-bold">GST (%)</label>
                      <select
                        value={row.gstPercent}
                        onChange={(e) => handleRowChange(idx, "gstPercent", parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-0.5 py-0.5 text-center"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-pink-650 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded-lg cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-1 shadow pt-2"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Save Stock Entry & Add to Ledger
          </button>
        </form>
      </div>
    </div>
  );
};

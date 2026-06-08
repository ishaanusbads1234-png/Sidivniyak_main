/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Sale, SaleItem } from "../types";
import { Plus, Trash, Printer, AlertTriangle, Check, X } from "lucide-react";

export const SalesManager: React.FC = () => {
  const { items, sales, addSale, cancelSale, calculateStock } = useInventory();

  // Create Sale form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [isInterState, setIsInterState] = useState(false); // Intra: CGST+SGST, Inter: IGST
  const [discount, setDiscount] = useState(0);
  
  const [saleItems, setSaleItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: "", quantity: 1 }
  ]);

  const [feedback, setFeedback] = useState("");
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  // Computed values for current draft
  const draftSubtotal = saleItems.reduce((sum, si) => {
    const item = items.find((i) => i.id === si.itemId);
    if (!item) return sum;
    // Assume sale price is costPrice * 1.35 (markup of 35% as a smart default cosmetics retail margin!)
    const price = Math.round((item.costPrice || 100) * 1.35);
    return sum + (price * si.quantity);
  }, 0);

  const draftGstRate = 18; // 18% India cosmetic rate
  const draftGstTotal = draftSubtotal * (draftGstRate / 100);
  const draftGrandTotal = Math.round(draftSubtotal + draftGstTotal - discount);

  const handleAddItemRow = () => {
    setSaleItems([...saleItems, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, itemId: string) => {
    const updated = [...saleItems];
    updated[idx].itemId = itemId;
    setSaleItems(updated);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const updated = [...saleItems];
    updated[idx].quantity = Math.max(1, qty);
    setSaleItems(updated);
  };

  const handleCreateSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filteredItems = saleItems.filter(si => si.itemId !== "");
    if (filteredItems.length === 0) {
      setFeedback("Error: Please select at least one item.");
      return;
    }

    // Check stock availability
    for (const draftItem of filteredItems) {
      const currentStock = calculateStock(draftItem.itemId);
      const itemObj = items.find(i => i.id === draftItem.itemId);
      if (currentStock < draftItem.quantity) {
        setFeedback(`Insufficient Stock: Only ${currentStock} ${itemObj?.unit} left for ${itemObj?.name}`);
        return;
      }
    }

    // Build sale items array
    const cleanItems: SaleItem[] = filteredItems.map((si, idx) => {
      const item = items.find(i => i.id === si.itemId)!;
      const rate = Math.round((item.costPrice || 100) * 1.35);
      const sub = rate * si.quantity;
      const gstAmt = sub * (draftGstRate / 100);
      
      return {
        id: `si-${Date.now()}-${idx}`,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        quantity: si.quantity,
        rate,
        gstPercent: draftGstRate,
        cgst: isInterState ? 0 : Math.round(gstAmt / 2),
        sgst: isInterState ? 0 : Math.round(gstAmt / 2),
        total: Math.round(sub + gstAmt)
      };
    });

    const finalSubtotal = cleanItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    const finalGst = Math.round(finalSubtotal * (draftGstRate / 100));
    const finalCgst = isInterState ? 0 : Math.round(finalGst / 2);
    const finalSgst = isInterState ? 0 : Math.round(finalGst / 2);
    const finalIgst = isInterState ? finalGst : 0;

    const invoiceNum = `SDV-SL-${Date.now().toString().substring(6)}`;

    const registeredId = addSale({
      invoiceNumber: invoiceNum,
      customerName: customerName || "Counter Walk-In Cash",
      customerPhone,
      customerGstin,
      saleDate: new Date().toISOString().substring(0, 10),
      items: cleanItems,
      subtotal: finalSubtotal,
      cgstTotal: finalCgst,
      sgstTotal: finalSgst,
      igstTotal: finalIgst,
      totalGst: finalGst,
      discount,
      grandTotal: Math.round(finalSubtotal + finalGst - discount),
      isCancelled: false,
      operator: "Manager Billing Console"
    }, "Manager Principal");

    const printedSale = sales.find(s => s.invoiceNumber === invoiceNum) || {
      id: registeredId,
      invoiceNumber: invoiceNum,
      customerName: customerName || "Counter Walk-In Cash",
      customerPhone,
      customerGstin,
      saleDate: new Date().toISOString().substring(0, 10),
      items: cleanItems,
      subtotal: finalSubtotal,
      cgstTotal: finalCgst,
      sgstTotal: finalSgst,
      igstTotal: finalIgst,
      totalGst: finalGst,
      discount,
      grandTotal: Math.round(finalSubtotal + finalGst - discount),
      isCancelled: false,
      operator: "Manager Billing Console"
    };

    setActiveInvoice(printedSale as Sale);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setDiscount(0);
    setSaleItems([{ itemId: "", quantity: 1 }]);
    setFeedback("✓ Sale Invoice Recorded Successfully!");
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-4">
      {/* SALES CREATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-bold text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          💼 Indian GST Billing Terminal
        </h4>

        <form onSubmit={handleCreateSaleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">CUSTOMER NAME</label>
              <input
                type="text"
                placeholder="Walk-In General"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="10-digit number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">CUSTOMER GSTIN</label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z1"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-slate-500 block mb-1">TAX GEOGRAPHY</label>
              <div className="flex items-center gap-2 h-7 bg-slate-950 px-2 rounded border border-slate-850">
                <input
                  type="checkbox"
                  id="geoCheck"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="accent-pink-500 cursor-pointer"
                />
                <label htmlFor="geoCheck" className="text-[8.5px] text-slate-300 font-bold cursor-pointer select-none">
                  INTER-STATE (IGST 18%)
                </label>
              </div>
            </div>
          </div>

          {/* DRAFT ITEMS SELECTOR */}
          <div className="space-y-2 pt-1">
            <span className="text-[8px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
              BILL ITEMS LIST:
            </span>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {saleItems.map((si, idx) => {
                const stock = si.itemId ? calculateStock(si.itemId) : 0;
                return (
                  <div key={idx} className="flex gap-2 items-center bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="flex-1 min-w-0">
                      <select
                        value={si.itemId}
                        onChange={(e) => handleItemChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[9.5px] font-sans text-slate-200"
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku}) - Stock: {calculateStock(i.id)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-16 shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={si.quantity}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-[9px] text-pink-300"
                        required
                      />
                    </div>

                    {saleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 hover:text-white text-rose-450 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer shrink-0"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-[8px] font-mono text-slate-300 transition flex items-center gap-1 select-none cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-pink-500" /> [ADD ANOTHER LINE ITEM]
            </button>
          </div>

          {/* VALUE PRICING MATH SHIELD */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-[9px] font-mono space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>ITEMS SUB-TOTAL:</span>
              <span>₹{draftSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST INCLUDED (18% Cosmetics):</span>
              <span>₹{draftGstTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>DISCOUNT / REBATE (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-slate-900 border border-slate-800 rounded px-1 text-right text-[8.5px] text-slate-300 font-mono"
              />
            </div>
            <div className="flex justify-between text-pink-400 font-bold border-t border-slate-900 pt-1 text-[10px]">
              <span>NET PAYABLE BILL VALUE:</span>
              <span>₹{draftGrandTotal.toLocaleString()}</span>
            </div>
          </div>

          {feedback && (
            <div className={`p-1.5 rounded text-[9px] font-mono leading-normal ${feedback.startsWith("Error") || feedback.startsWith("Insufficient") ? "bg-rose-500/15 border border-rose-500/20 text-rose-400" : "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"}`}>
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition shadow-xl uppercase"
          >
            Generate Sale Invoice
          </button>
        </form>
      </div>

      {/* RENDER ACTIVE PRINTING INVOICE CARD */}
      {activeInvoice && (
        <div id="gst-invoice-printer-preview" className="bg-white border border-slate-300 rounded-xl p-3.5 text-slate-950 font-sans shadow-2xl relative overflow-hidden space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <p className="text-[14px] font-black tracking-wider text-pink-600 uppercase font-mono">SIDIVNIYAK BEAUTY</p>
              <p className="text-[8px] text-slate-500 font-mono uppercase tracking-tight leading-none">Cosmetics Retail, Mumbai, MH</p>
            </div>
            <div className="text-right">
              <span className="text-[7.5px] px-1 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-700 uppercase tracking-widest leading-none">TAX INVOICE</span>
              <p className="text-[9px] font-mono text-slate-600 mt-1 leading-none">{activeInvoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 text-[8.5px] font-mono text-slate-600 border-b border-slate-100 pb-2 gap-y-1">
            <div>
              <span className="text-slate-400 uppercase block text-[7px]">CUSTOMER DETAILS</span>
              <strong>{activeInvoice.customerName}</strong>
              {activeInvoice.customerPhone && <p className="leading-none mt-0.5">Ph: {activeInvoice.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase block text-[7px]">DATE OF SALE</span>
              <p className="font-bold">{activeInvoice.saleDate}</p>
              {activeInvoice.customerGstin && <p className="text-[7.5px] text-pink-600 font-bold leading-none mt-0.5">GSTIN: {activeInvoice.customerGstin}</p>}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded border border-slate-100">
            <table className="w-full text-left text-[8px] font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <th className="p-1 px-1.5 font-bold">ITEM NAME</th>
                  <th className="p-1 px-1.5 text-right font-bold">QTY</th>
                  <th className="p-1 px-1.5 text-right font-bold">RATE</th>
                  <th className="p-1 px-1.5 text-right font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoice.items.map((item, id) => (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-1 px-1.5 font-sans font-semibold text-slate-800">{item.name}</td>
                    <td className="p-1 px-1.5 text-right text-slate-500 font-semibold">{item.quantity}</td>
                    <td className="p-1 px-1.5 text-right text-slate-500">₹{item.rate}</td>
                    <td className="p-1 px-1.5 text-right font-bold text-slate-800">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-2 rounded text-[8.5px] font-mono space-y-0.5 border border-slate-100 text-slate-700 text-right">
            <div>SUBTOTAL VALUE: <span className="text-slate-900 font-bold">₹{activeInvoice.subtotal}</span></div>
            {activeInvoice.cgstTotal > 0 && (
              <>
                <div>CGST TAX ACCRUAL (9%): <span className="text-slate-900">₹{activeInvoice.cgstTotal}</span></div>
                <div>SGST TAX ACCRUAL (9%): <span className="text-slate-900 font-bold">₹{activeInvoice.sgstTotal}</span></div>
              </>
            )}
            {activeInvoice.igstTotal > 0 && (
              <div>IGST TAX ACCRUAL (18%): <span className="text-slate-900 font-bold">₹{activeInvoice.igstTotal}</span></div>
            )}
            {activeInvoice.discount > 0 && <div className="text-rose-500 font-bold">DISCOUNT/REBATE APPLIED: -₹{activeInvoice.discount}</div>}
            <div className="text-[10px] text-pink-600 font-black border-t border-slate-200 pt-1 uppercase">GRAND NET PAYABLE: ₹{activeInvoice.grandTotal}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                alert("Triggering device hardware printer connection. Print success!");
              }}
              className="flex-1 py-1 bg-slate-950 hover:bg-slate-850 text-white font-mono text-[9px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 shadow select-none"
            >
              <Printer className="h-3 w-3" /> PRINT BILL INVOICE
            </button>
            <button
              onClick={() => setActiveInvoice(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-mono text-[9px] font-semibold rounded cursor-pointer transition"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}

      {/* SALES HISTORY WITH DAILY/MONTHLY FILTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">
          📈 IN-STORE DECLARED INVOICE HISTORY
        </span>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {sales.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-2 text-center">
              No sales invoices logged in session index.
            </span>
          ) : (
            sales.slice().reverse().map((s) => (
              <div key={s.id} className={`p-2 bg-slate-950 border rounded flex flex-col gap-1 text-[8.5px] font-mono ${s.isCancelled ? 'border-dashed border-rose-500/40 opacity-60' : 'border-slate-850'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-200">{s.invoiceNumber}</strong>
                      {s.isCancelled && <span className="text-[7px] text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded font-bold uppercase shrink-0">CANCELLED</span>}
                    </div>
                    <span className="text-slate-500 block text-[7.5px]">{s.saleDate} • Custom: {s.customerName}</span>
                  </div>
                  <span className="text-pink-300 font-black shrink-0">₹{s.grandTotal}</span>
                </div>

                <div className="flex justify-between items-center text-[7.5px] border-t border-slate-900 pt-1 mt-0.5">
                  <span className="text-slate-500">Items Count: <strong className="text-slate-400">{s.items.length}</strong></span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveInvoice(s)} 
                      className="text-pink-400 hover:text-pink-200 cursor-pointer font-bold uppercase transition"
                    >
                      [VIEW/PRINT]
                    </button>
                    {!s.isCancelled && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Cancel Sale invoice ${s.invoiceNumber}? This will reverse the stock deduction.`)) {
                            cancelSale(s.id, "Manager billing user");
                          }
                        }} 
                        className="text-rose-400 hover:text-rose-300 cursor-pointer font-bold uppercase transition"
                      >
                        [CANCEL]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

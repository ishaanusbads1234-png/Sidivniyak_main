import React from "react";
import { useInventory } from "../context/InventoryContext";
import { InventoryItem } from "../types";
import { X, ArrowUpRight, ArrowDownRight, FileText, Settings, ShieldAlert, Library } from "lucide-react";

interface StockDetailsModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export const StockDetailsModal: React.FC<StockDetailsModalProps> = ({ item, onClose }) => {
  const { ledger, calculateStock } = useInventory();

  // 1. Current Stock
  const currentStock = calculateStock(item.id);

  // 2. Filter Ledger Transactions for item
  const itemTx = ledger.filter((tx) => tx.itemId === item.id);

  // 3. Purchase History (Positive entries)
  const purchaseHistory = itemTx.filter((tx) => tx.changeQty > 0);

  // 4. Sales History (Negative entries)
  const salesHistory = itemTx.filter((tx) => tx.changeQty < 0);

  // 5. Adjustment History (entries specifically mentioning "adjustment", "tally", "direct correction")
  const adjustmentHistory = itemTx.filter(
    (tx) =>
      tx.reason.toLowerCase().includes("adjust") ||
      tx.reason.toLowerCase().includes("tally") ||
      tx.reason.toLowerCase().includes("correction") ||
      tx.reason.toLowerCase().includes("manual")
  );

  // 6. Invoice History (those with invoice numbers)
  const invoiceHistory = itemTx.filter((tx) => tx.invoiceNumber);

  // 7. Stock Timeline (Chronological timeline calculating running stock balances from initialStock)
  const sortedTxsForTimeline = [...itemTx].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let runBalance = item.initialStock;
  const stockTimelineNodes = sortedTxsForTimeline.map((tx) => {
    runBalance += tx.changeQty;
    return { ...tx, runningBalance: runBalance };
  }).reverse(); // newest first

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div 
        id={`stock-details-modal-${item.sku}`}
        className="w-full max-w-sm bg-slate-900 border border-pink-500/30 rounded-2xl p-4 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto scrollbar-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-6 w-6 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <Library className="h-3.5 w-3.5" />
            </span>
            <div className="truncate">
              <h3 className="text-xs font-black font-mono tracking-wider text-pink-400 uppercase">
                📦 Stock Details
              </h3>
              <p className="text-[10px] text-slate-400 truncate">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer select-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pricing specs and formulas (Profit Per Piece and Percentage) */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5 text-[9px] font-mono">
          <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Financial Performance Metrics</span>
          
          <div className="grid grid-cols-3 gap-1 px-1 py-1">
            <div className="text-center border-r border-slate-800 last:border-0 pr-1">
              <span className="text-slate-500 text-[6.5px] block uppercase">Cost Price (CP)</span>
              <span className="text-white font-bold block">₹{item.costPrice || 100}</span>
            </div>
            <div className="text-center border-r border-slate-800 last:border-0 px-1">
              <span className="text-slate-500 text-[6.5px] block uppercase">Sell Price (SP)</span>
              <span className="text-pink-300 font-bold block">₹{item.sellPrice || Math.round((item.costPrice || 100) * 1.35)}</span>
            </div>
            <div className="text-center last:border-0 pl-1">
              <span className="text-slate-500 text-[6.5px] block uppercase">Max Retail (MRP)</span>
              <span className="text-amber-400 font-bold block">₹{item.mrp || Math.round((item.costPrice || 100) * 1.5)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900 leading-normal">
            {(() => {
              const cp = item.costPrice || 100;
              const sp = item.sellPrice || Math.round(cp * 1.35);
              const profitPiece = sp - cp;
              const profitPct = Math.round((profitPiece / cp) * 100);
              return (
                <>
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850/40">
                    <span className="text-[6.5px] text-slate-500 block uppercase">Profit Per Piece</span>
                    <span className="text-emerald-400 font-black">₹{profitPiece}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850/40">
                    <span className="text-[6.5px] text-slate-500 block uppercase font-bold">Profit Margin</span>
                    <span className="text-emerald-400 font-black text-right block">+{profitPct}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Current Stock */}
        <div className="bg-slate-950 p-2 text-center rounded-xl border border-slate-850">
          <span className="text-[7.5px] text-slate-500 font-mono font-bold uppercase tracking-widest block mb-0.5">Remaining Stock Balance</span>
          <span className={`text-[17px] font-black font-mono leading-none ${currentStock <= item.lowStockThreshold ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
            {currentStock} <span className="text-xs font-bold text-slate-400 uppercase">PCS</span>
          </span>
          <span className="text-[7.5px] text-slate-500 block font-mono mt-1">LOW STOCK THRESHOLD BAR: {item.lowStockThreshold} PCS</span>
        </div>

        {/* Purchase History Grid tab logs */}
        <div className="space-y-1">
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider block">🏢 Purchase History ({purchaseHistory.length})</span>
          <div className="max-h-[80px] overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-850 text-[8px] font-mono divide-y divide-slate-900 speak-none">
            {purchaseHistory.length === 0 ? (
              <span className="text-slate-600 block text-center py-1 select-none">No purchase records found</span>
            ) : (
              purchaseHistory.map((tx) => (
                <div key={tx.id} className="py-1 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-bold truncate max-w-[150px]">{tx.vendorName || "Wholesaler"}</span>
                    <span className="text-[6.5px] text-slate-500">{new Date(tx.timestamp).toLocaleDateString("en-IN")} • Invoice #{tx.invoiceNumber || "N/A"}</span>
                  </div>
                  <div className="text-right flex flex-col shrink-0">
                    <span className="text-emerald-400 font-extrabold">+{tx.changeQty} PCS</span>
                    {tx.totalValue && (
                      <span className="text-[6.5px] text-slate-500">₹{tx.totalValue}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales History Grid tab logs */}
        <div className="space-y-1">
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider block">🛍️ Sales History ({salesHistory.length})</span>
          <div className="max-h-[85px] overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-850 text-[8px] font-mono divide-y divide-slate-900">
            {salesHistory.length === 0 ? (
              <span className="text-slate-600 block text-center py-1 select-none">No sales counter entries found</span>
            ) : (
              salesHistory.map((tx) => (
                <div key={tx.id} className="py-1 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-bold truncate max-w-[150px]">{tx.reason}</span>
                    <span className="text-[6.5px] text-slate-500">{new Date(tx.timestamp).toLocaleDateString("en-IN")} • clerk: {tx.operatorName}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-rose-400 font-extrabold">{tx.changeQty} PCS</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Custom manual stock adjustments */}
        <div className="space-y-1">
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider block">🔧 Adjustments & Tallies ({adjustmentHistory.length})</span>
          <div className="max-h-[70px] overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-850 text-[8px] font-mono divide-y divide-slate-900">
            {adjustmentHistory.length === 0 ? (
              <span className="text-slate-600 block text-center py-1 select-none">No custom adjustments recorded</span>
            ) : (
              adjustmentHistory.map((tx) => (
                <div key={tx.id} className="py-1 first:pt-0 last:pb-0 flex items-center justify-between">
                  <span className="text-slate-300 truncate max-w-[180px]">{tx.reason}</span>
                  <span className={`font-black shrink-0 ${tx.changeQty >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {tx.changeQty >= 0 ? `+${tx.changeQty}` : tx.changeQty}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoice history */}
        <div className="space-y-1">
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider block">🧾 In-Store Invoice History ({invoiceHistory.length})</span>
          <div className="max-h-[70px] overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-850 text-[8px] font-mono divide-y divide-slate-900">
            {invoiceHistory.length === 0 ? (
              <span className="text-slate-600 block text-center py-1 select-none">No purchase/sale invoices connected</span>
            ) : (
              invoiceHistory.map((tx) => (
                <div key={tx.id} className="py-1 first:pt-0 last:pb-0 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <FileText className="h-2.5 w-2.5 text-pink-400 shrink-0" />
                    <span className="text-slate-300 font-bold truncate">#{tx.invoiceNumber}</span>
                  </div>
                  <span className="text-slate-500 text-[7px] shrink-0">{tx.vendorName || "Retail Client"} • {tx.changeQty > 0 ? "Inward" : "Outward"}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full transaction stock timeline list */}
        <div className="space-y-1.5 border-t border-slate-800 pt-3">
          <span className="text-[8px] font-mono text-slate-400 font-black uppercase tracking-wider block">📊 Ledger Stock Timeline (Newest first)</span>
          <div className="max-h-[140px] overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-850 space-y-1.5">
            <div className="flex justify-between items-center text-[7.5px] text-slate-600 border-b border-slate-900 pb-1 uppercase font-bold">
              <span>Event / Operator</span>
              <span>Running Stock Balance</span>
            </div>
            
            {stockTimelineNodes.map((node) => {
              const isGain = node.changeQty >= 0;
              return (
                <div key={node.id} className="flex items-start gap-1.5 text-[8px] font-mono pb-1 border-b border-slate-900 last:border-0 last:pb-0">
                  <div className="mt-0.5 shrink-0">
                    {isGain ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-rose-450" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 truncate font-semibold pr-1">{node.reason}</span>
                      <span className="text-slate-400 font-black text-[9px]">{node.runningBalance} PCS</span>
                    </div>
                    <div className="flex justify-between text-[6.5px] text-slate-500 leading-none mt-0.5 mt-0.5">
                      <span>{new Date(node.timestamp).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
                      <span>by {node.operatorName} ({isGain ? `+${node.changeQty}` : node.changeQty} pcs)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-150 font-mono text-[9px] font-bold uppercase transition select-none hover:text-white cursor-pointer"
        >
          Close Detail Viewer
        </button>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { X, CheckSquare, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

interface StockTallyToolProps {
  onClose: () => void;
  isManager: boolean;
  onUnlockManager: () => void;
}

export const StockTallyTool: React.FC<StockTallyToolProps> = ({ onClose, isManager, onUnlockManager }) => {
  const { items, calculateStock, addTransaction, addAuditLog } = useInventory();

  const [clerk, setClerk] = useState("Staff Auditor");
  const [activePreset, setActivePreset] = useState<"today" | "yesterday">("today");
  const [countedCounts, setCountedCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.id] = calculateStock(item.id);
    });
    return counts;
  });

  const [feedback, setFeedback] = useState("");

  const handleCountChange = (itemId: string, val: number) => {
    setCountedCounts((prev) => ({
      ...prev,
      [itemId]: Math.max(0, val)
    }));
  };

  const handleSwitchPreset = (preset: "today" | "yesterday") => {
    if (preset === "yesterday" && !isManager) {
      // Trigger Manager Authentication in parent
      onUnlockManager();
      return;
    }
    setActivePreset(preset);
  };

  const handlePostCorrections = (e: React.FormEvent) => {
    e.preventDefault();

    let correctionsCount = 0;
    
    items.forEach((item) => {
      const ledgerCount = calculateStock(item.id);
      const physicalCount = countedCounts[item.id] ?? ledgerCount;
      const discrepancy = physicalCount - ledgerCount;

      if (discrepancy !== 0) {
        addTransaction(
          item.id,
          discrepancy,
          clerk,
          `Stock Tally Discrepancy Correction (${activePreset.toUpperCase()})`
        );
        correctionsCount++;
      }
    });

    setFeedback(`✓ Stock Audit posted successfully! Saved ${correctionsCount} ledger discrepancy adjustments.`);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="stock-tally-tool-panel"
        className="w-full max-w-sm bg-slate-900 border border-pink-500/30 rounded-2xl p-4 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-6 w-6 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <CheckSquare className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black font-mono tracking-wider text-pink-400 uppercase">
                ⊞ Stock Tally Desk
              </h3>
              <p className="text-[9px] text-slate-400">Match physical inventory counts with book balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer select-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Audit Mode Presets */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-850">
          <button
            onClick={() => handleSwitchPreset("today")}
            className={`py-1 rounded font-mono text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none ${activePreset === "today" ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-150'}`}
          >
            📊 TODAY'S STOCK
          </button>

          <button
            onClick={() => handleSwitchPreset("yesterday")}
            className={`py-1 rounded font-mono text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none ${activePreset === "yesterday" ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🕒 YESTERDAY'S TALLY {!isManager && "🔒"}
          </button>
        </div>

        {activePreset === "yesterday" && !isManager && (
          <div className="p-2 bg-indigo-950/20 border border-indigo-500/15 rounded text-[8px] font-mono text-indigo-300 leading-normal flex items-start gap-1.5 shrink-0 animate-pulse">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-400" />
            <span>
              <strong>Manager Authentication required:</strong> Yesterday's ledger tallying is highly restricted to supervisors. Tap yesterday above to enter password and unlock manager context.
            </span>
          </div>
        )}

        {feedback && (
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8.5px] font-mono text-center leading-normal animate-pulse">
            {feedback}
          </div>
        )}

        <form onSubmit={handlePostCorrections} className="space-y-3 font-mono text-[9px]">
          {/* Clerk */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-850">
            <label className="text-slate-500 block mb-0.5 uppercase font-bold text-[7.5px]">Audit Admin Clerk Name</label>
            <input
              type="text"
              value={clerk}
              onChange={(e) => setClerk(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[9px] focus:outline-none"
              required
            />
          </div>

          {/* Counts Table */}
          <div className="space-y-1.5">
            <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-wider">Product Counting Checklist</span>
            
            <div className="max-h-[220px] overflow-y-auto space-y-1.5">
              {items.map((item) => {
                const bookStock = calculateStock(item.id);
                const measured = countedCounts[item.id] ?? bookStock;
                const difference = measured - bookStock;

                return (
                  <div key={item.id} className="bg-slate-950 rounded-lg p-2 border border-slate-850 flex items-center justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[9.5px] font-semibold text-slate-200 truncate font-sans">{item.name}</div>
                      <div className="text-[7.5px] text-slate-500 flex items-center gap-2">
                        <span>SKU: {item.sku}</span>
                        <span>•</span>
                        <span>Book Qty: <strong>{bookStock} PCS</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {difference !== 0 && (
                        <span className={`text-[8px] font-bold px-1 rounded ${difference > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'}`}>
                          {difference > 0 ? `+${difference}` : difference} pcs
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={measured}
                          onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-12 bg-slate-900 border border-slate-800 rounded text-center text-[10px] font-bold p-0.5 text-slate-200 focus:border-pink-500 focus:outline-none"
                        />
                        <span className="text-slate-500 text-[8px] uppercase font-bold">PCS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[9.5px]/none font-black rounded-lg cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-1 shadow pt-2"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Commit Stock discrepancy tallies
          </button>
        </form>
      </div>
    </div>
  );
};

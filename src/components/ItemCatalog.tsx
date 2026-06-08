import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { InventoryItem } from "../types";
import { Search, Plus, Minus, AlertTriangle, ArrowRightLeft, ShieldAlert, CheckCircle2, Eye, Box } from "lucide-react";

interface ItemCatalogProps {
  onSelectItem: (item: InventoryItem) => void;
  selectedItemId: string | null;
  onOpenAddManagerGate: () => void;
  onViewStockDetails: (item: InventoryItem) => void;
  onRegisterSku: () => void;
  filterMode?: "all" | "low-stock";
  onClearFilter?: () => void;
}

export const ItemCatalog: React.FC<ItemCatalogProps> = ({
  onSelectItem,
  selectedItemId,
  onOpenAddManagerGate,
  onViewStockDetails,
  onRegisterSku,
  filterMode = "all",
  onClearFilter
}) => {
  const { items, calculateStock, addTransaction, isManagerMode } = useInventory();
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState<number>(10);
  const [adjReason, setAdjReason] = useState("");
  const [operatorName, setOperatorName] = useState("Staff Register");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterMode === "low-stock") {
      const currentQty = calculateStock(item.id);
      return matchesSearch && (currentQty <= item.lowStockThreshold);
    }
    return matchesSearch;
  });

  const startAdjusting = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdjustingItemId(adjustingItemId === item.id ? null : item.id);
    setAdjAmount(10);
    setAdjReason("Manual inventory counter audit adjustment");
    setSuccessMsg("");
    setErrorMsg("");
  };

  const submitAdjustment = (item: InventoryItem, isPositive: boolean) => {
    if (!operatorName.trim()) {
      setErrorMsg("Please type validator initials!");
      return;
    }
    if (adjAmount <= 0) {
      setErrorMsg("Count target must be 1 or higher.");
      return;
    }

    const delta = isPositive ? adjAmount : -adjAmount;
    const currentStock = calculateStock(item.id);

    if (!isPositive && currentStock + delta < 0) {
      setErrorMsg(`Insufficient stock: Only ${currentStock} PCS available.`);
      return;
    }

    addTransaction(
      item.id,
      delta,
      operatorName.trim(),
      isPositive 
        ? `Manual Restock: ${adjReason || "Store shipment inward entry"}`
        : `Manual Deduct: ${adjReason || "Direct Counter Sale / wastage dispatch"}`
    );

    setSuccessMsg(`✓ Stock ledger row recorded: ${isPositive ? "+" : ""}${delta} PCS successfully synced.`);
    setErrorMsg("");
    setTimeout(() => {
      setSuccessMsg("");
      setAdjustingItemId(null);
    }, 1800);
  };

  return (
    <div id="catalog-section" className="space-y-3">
      
      {/* Search Header Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-black font-mono text-pink-400 uppercase tracking-widest leading-none">
              Cosmetics Shelf Catalog
            </h3>
            <p className="text-[8.5px] text-slate-500 mt-1 font-mono">
              Select product cards to trace transaction ledgers
            </p>
          </div>
          <button
            onClick={onRegisterSku}
            className="px-2 py-1 rounded bg-pink-650 hover:bg-pink-600 font-mono text-[8px] font-bold text-white transition active:scale-95 cursor-pointer shadow flex items-center gap-0.5"
            type="button"
          >
            + REGISTER SKU
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-500" />
          <input
            id="catalog-search-input"
            type="text"
            placeholder="Search lipstick, eyeliner, creams, shampoo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[9.5px]/none font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {filterMode === "low-stock" && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center justify-between text-[9px] font-mono text-amber-400 animate-fadeIn select-none">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            ⚠️ LOW STOCK REGISTER FILTER ACTIVE
          </div>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[7.5px] font-extrabold uppercase transition cursor-pointer"
              type="button"
            >
              Show All Products
            </button>
          )}
        </div>
      )}

      {/* Product List Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-slate-500 font-mono text-[9px] bg-slate-900 border border-slate-850 rounded-xl">
            No matching makeup products found.
          </div>
        ) : (
          filteredItems.map((item) => {
            const currentStock = calculateStock(item.id);
            const isLow = currentStock <= item.lowStockThreshold;
            const isSelected = selectedItemId === item.id;

            return (
              <div
                id={`item-row-${item.sku}`}
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-3 bg-slate-900 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected 
                    ? "border-pink-500/80 bg-gradient-to-b from-slate-900 to-pink-950/10 shadow-lg shadow-pink-900/5" 
                    : "border-slate-800 hover:border-slate-750"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="inline-block px-1 bg-slate-950 text-pink-300 font-mono text-[7px] font-bold border border-slate-850 rounded uppercase">
                      {item.category}
                    </span>
                    <h4 className="text-[10px] font-bold text-slate-100 font-sans tracking-wide leading-tight mt-0.5">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[7.5px] text-slate-500 font-mono">
                      <span>SKU: {item.sku}</span>
                      <span>•</span>
                      <span>Shelf: {item.location || "Rack A"}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0 select-none">
                    <div className="flex items-baseline gap-0.5">
                      <span className={`font-mono text-xs font-black ${isLow ? 'text-amber-400' : 'text-emerald-450'}`}>
                        {currentStock}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">PCS</span>
                    </div>
                    <span className="text-[7.5px] text-slate-500 font-normal leading-none mt-0.5">Low Limit: {item.lowStockThreshold} pcs</span>
                    {isLow && (
                      <span className="mt-1 inline-flex items-center gap-0.5 px-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[7.5px] font-mono animate-pulse font-semibold">
                        <AlertTriangle className="h-1.5 w-1.5" /> RE-ORDER LEVEL
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono border-t border-slate-850/60 pt-2 mt-2 select-none">
                  <span className="text-slate-500">₹{item.sellPrice || 120} MRP / ₹{item.costPrice || 90} CP</span>
                  
                  <div className="flex gap-1">
                    {/* View Custom Stock details log button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewStockDetails(item);
                      }}
                      className="px-2 py-0.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-sky-400 transition cursor-pointer flex items-center gap-0.5 font-bold"
                      type="button"
                    >
                      <Box className="h-2.5 w-2.5" /> [📦 Stock Details]
                    </button>

                    {/* Restock/adjust trigger */}
                    <button
                      id={`btn-adjust-${item.sku}`}
                      onClick={(e) => startAdjusting(item, e)}
                      className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition cursor-pointer flex items-center gap-0.5 font-semibold"
                      type="button"
                    >
                      <ArrowRightLeft className="h-2.5 w-2.5 text-pink-500" />
                      {adjustingItemId === item.id ? "Close" : "Adjust"}
                    </button>
                  </div>
                </div>

                {/* Inner adjustment workspace */}
                {adjustingItemId === item.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-850 space-y-2.5 text-[8.5px]"
                  >
                    {!isManagerMode && (
                      <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[7.5px] rounded flex items-center gap-1 leading-normal">
                        <ShieldAlert className="h-3 w-3 shrink-0 text-amber-400" />
                        <span>Staff Mode: Outward deduction is audited. Positive stock changes require Supervisor Mode.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[8px]">
                      <div>
                        <label className="block text-[7.5px] text-slate-500 font-mono uppercase mb-0.5">Clerk Initials</label>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[7.5px] text-slate-500 font-mono uppercase mb-0.5">Count Qty (PCS)</label>
                        <input
                          type="number"
                          min="1"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-pink-400 font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[7.5px] text-slate-500 font-mono uppercase mb-0.5 font-sans">Audit Reason Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Broken sample tester"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-sans text-slate-100 text-[10px] focus:outline-none"
                      />
                    </div>

                    {errorMsg && (
                      <div className="text-[8px] text-rose-400 font-mono font-semibold">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    {successMsg && (
                      <div className="text-[8px] text-emerald-400 font-mono flex items-center gap-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {successMsg}
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-900">
                      <button
                        onClick={() => submitAdjustment(item, false)}
                        className="px-2 py-0.8 bg-pink-950/60 hover:bg-pink-900 border border-pink-500/30 text-pink-300 font-mono font-bold rounded cursor-pointer transition flex items-center gap-0.5"
                        type="button"
                      >
                        <Minus className="h-2.5 w-2.5" /> DEDUCT STOCK (SELL)
                      </button>

                      <button
                        disabled={!isManagerMode}
                        onClick={() => submitAdjustment(item, true)}
                        className={`px-2 py-0.8 rounded font-mono font-bold transition flex items-center gap-0.5 ${
                          isManagerMode
                            ? "bg-emerald-950 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900 cursor-pointer"
                            : "bg-slate-900 text-slate-650 border border-slate-850 cursor-not-allowed select-none"
                        }`}
                        title={!isManagerMode ? "Enter password in manager section to restock" : "Inward adjust"}
                        type="button"
                      >
                        <Plus className="h-2.5 w-2.5" /> ADD STOCK (RESTOCK)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

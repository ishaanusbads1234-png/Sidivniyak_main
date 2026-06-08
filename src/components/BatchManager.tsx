/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Calendar, AlertOctagon, HelpCircle, Flame, CheckCircle, Search } from "lucide-react";

export const BatchManager: React.FC = () => {
  const { items } = useInventory();
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 3600 * 1000);

  // Flatten all batches with parent item reference
  const allBatches = items.flatMap(item => {
    const itemBatches = item.batches || [];
    return itemBatches.map(b => ({
      ...b,
      parentItemId: item.id,
      parentItemName: item.name,
      parentItemSku: item.sku,
      category: item.category,
      unit: item.unit
    }));
  });

  // Calculate status tags
  const getBatchStatus = (expiryStr: string, currentQty: number) => {
    if (currentQty <= 0) return { label: "DEPLETED", color: "text-slate-500 bg-slate-900 border-slate-800" };
    
    const expDate = new Date(expiryStr);
    if (expDate < today) {
      return { label: "EXPIRED", color: "text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold" };
    } else if (expDate <= sixtyDaysFromNow) {
      return { label: "EXPIRING SOON", color: "text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold" };
    } else {
      return { label: "SAFE / ACTIVE", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
  };

  // Filter batches
  const filteredBatches = allBatches.filter(b => 
    b.parentItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.parentItemSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()); // FEFO sort: nearest expiry first

  // Summary widgets
  const expiredCount = allBatches.filter(b => b.currentQty > 0 && new Date(b.expiryDate) < today).length;
  const expiringSoonCount = allBatches.filter(b => b.currentQty > 0 && new Date(b.expiryDate) >= today && new Date(b.expiryDate) <= sixtyDaysFromNow).length;

  return (
    <div className="space-y-4">
      {/* EXPIRED ALERTS & METRIC BADGES */}
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono select-none">
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-2.5 text-rose-400 flex items-center justify-between">
          <div>
            <span className="block text-[7.5px] text-slate-500 uppercase">EXPIRED SKU LOTS (CRITICAL!)</span>
            <strong className="text-sm font-black">{expiredCount} LOTS</strong>
          </div>
          <Flame className="h-5 w-5 text-rose-500 animate-pulse shrink-0" />
        </div>

        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-amber-400 flex items-center justify-between">
          <div>
            <span className="block text-[7.5px] text-slate-500 uppercase">EXPIRING IN 60 DAYS</span>
            <strong className="text-sm font-black">{expiringSoonCount} LOTS</strong>
          </div>
          <AlertOctagon className="h-5 w-5 text-amber-500 shrink-0" />
        </div>
      </div>

      {/* SEARCH AND EXPLAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded border border-slate-800 text-[10px] font-sans">
          <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search lot batch number, name, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-[9.5px] font-sans text-slate-200"
          />
        </div>

        <div className="p-2 bg-slate-950 border border-slate-850 rounded text-[8px] font-mono text-slate-400 leading-relaxed uppercase flex items-start gap-1">
          <HelpCircle className="h-3.5 w-3.5 text-pink-500 shrink-0 mt-0.5" />
          <span>
            <strong>First-Expired, First-Out (FEFO):</strong> In-store customer sales automatically consume stock from the oldest unexpired batch first to limit expired shelf waste.
          </span>
        </div>
      </div>

      {/* BATCH TIMELINE CARDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">
          🔬 Cosmetics Batches Chronological Expiration Ledger
        </span>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {filteredBatches.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-4 text-center">
              No product batches found in system index
            </span>
          ) : (
            filteredBatches.map((b) => {
              const status = getBatchStatus(b.expiryDate, b.currentQty);
              const formattedExp = new Date(b.expiryDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              });

              return (
                <div key={b.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-1.5 text-[8.5px] font-mono relative overflow-hidden">
                  <div className="flex justify-between items-start border-b border-slate-900/40 pb-1.5">
                    <div>
                      <h6 className="text-[9px] font-bold text-white font-sans leading-none">{b.parentItemName}</h6>
                      <span className="text-slate-500 text-[7px] mt-0.5 block">SKU: {b.parentItemSku} • Category: {b.category}</span>
                    </div>

                    <span className={`text-[7px] px-1 py-0.2 rounded font-bold uppercase border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[7.5px] text-slate-400">
                    <div className="bg-slate-900/40 p-1 rounded border border-slate-900">
                      <span className="text-slate-500 block">LOT NUMBER</span>
                      <strong className="text-white text-[8.5px]">{b.batchNumber || "N/A"}</strong>
                    </div>
                    <div className="bg-slate-900/40 p-1 rounded border border-slate-900">
                      <span className="text-slate-500 block">CURRENT STOCK</span>
                      <strong className={`text-[9px] ${b.currentQty <= 0 ? 'text-slate-600' : 'text-pink-300'}`}>
                        {b.currentQty} {b.unit}
                      </strong>
                    </div>
                    <div className="bg-slate-900/40 p-1 rounded border border-slate-900">
                      <span className="text-slate-500 block">EXPIRY DATE</span>
                      <strong className={`text-[8.5px] ${status.label === "EXPIRED" ? 'text-rose-450' : 'text-slate-300'}`}>
                        {formattedExp}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { ListFilter, Search, Clock, ArrowUpRight, ArrowDownRight, RefreshCw, FileText } from "lucide-react";

export const LedgerLogs: React.FC = () => {
  const { ledger, items, resetLedgerToFactory, isManagerMode } = useInventory();
  const [filterItemId, setFilterItemId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLedger = ledger.filter((entry) => {
    const item = items.find((i) => i.id === entry.itemId);
    const sku = item?.sku || "";
    const name = item?.name || "";

    const matchesItem = filterItemId === "all" || entry.itemId === filterItemId;
    const matchesSearch =
      sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.invoiceNumber && entry.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesItem && matchesSearch;
  });

  // Sort logs: newest first
  const sortedLedger = [...filteredLedger].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }) + " - " + d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div id="ledger-logs-section" className="space-y-3">
      
      {/* Title & Reset Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold font-mono text-pink-400 uppercase tracking-wider">
            Shop History Logs
          </h3>
          <p className="text-[10px] text-slate-400">
            Immutable log of counter transactions
          </p>
        </div>

        {isManagerMode && (
          <button
            id="btn-factory-reset"
            onClick={() => {
              if (confirm("Factory reset beauty store register back to demo defaults?")) {
                resetLedgerToFactory();
              }
            }}
            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 font-mono text-[8px] font-bold text-rose-400 transition cursor-pointer"
          >
            RESET ALL
          </button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        {/* Item select filter */}
        <div>
          <label className="block text-[8px] text-slate-500 font-mono mb-1 uppercase">Filter by Product</label>
          <div className="relative">
            <ListFilter className="absolute left-2 top-2 h-3 w-3 text-slate-500" />
            <select
              id="ledger-filter-select"
              value={filterItemId}
              onChange={(e) => setFilterItemId(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-slate-950 border border-slate-850 rounded text-[10px] font-mono text-slate-300 focus:outline-none"
            >
              <option value="all">All Cosmetics Items</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Text search filter */}
        <div>
          <label className="block text-[8px] text-slate-500 font-mono mb-1 uppercase">Search notes</label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-500" />
            <input
              id="ledger-search-input"
              type="text"
              placeholder="Search clerk initials, reasons, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-slate-950 border border-slate-850 rounded text-[10px] font-sans text-slate-300 placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* REAL LEDGER ENTRIES LIST */}
      <div className="space-y-2">
        {sortedLedger.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-[10px] bg-slate-900/60 rounded-lg border border-slate-800">
            No register entries matched this filter.
          </div>
        ) : (
          sortedLedger.map((tx) => {
            const connectedItem = items.find((i) => i.id === tx.itemId);
            const isGain = tx.changeQty >= 0;

            return (
              <div
                id={`ledger-tx-${tx.id}`}
                key={tx.id}
                className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2 hover:border-slate-700 transition"
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded ${
                        isGain
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      }`}
                    >
                      {isGain ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-sans font-bold text-[11px] text-slate-200 leading-tight">
                        {connectedItem ? connectedItem.name : "Unrecognized Cosmetic"}
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">
                        SKU: {connectedItem ? connectedItem.sku : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <span className={`font-mono text-xs font-black ${isGain ? 'text-emerald-400' : 'text-pink-400'} shrink-0`}>
                    {isGain ? `+${tx.changeQty}` : tx.changeQty} {connectedItem?.unit || "pcs"}
                  </span>
                </div>

                {/* Reason note */}
                <p className="text-[10px] font-sans text-slate-300 bg-slate-950/40 p-1.5 rounded border border-slate-850">
                  {tx.reason}
                </p>

                {/* Meta details */}
                <div className="flex flex-wrap justify-between items-center gap-1 text-[8px] font-mono text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {formatTimestamp(tx.timestamp)}
                  </span>
                  <span>Clerk: <strong className="text-slate-400">{tx.operatorName}</strong></span>
                </div>

                {/* Optional invoice fields */}
                {tx.invoiceNumber && (
                  <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded text-[8px] font-mono text-pink-300 border border-pink-500/10">
                    <span className="flex items-center gap-0.5 shrink-0">
                      <FileText className="h-2.5 w-2.5" /> Bill Ref: {tx.invoiceNumber}
                    </span>
                    {tx.totalValue && (
                      <span>Val: ₹ {typeof tx.totalValue === 'number' ? tx.totalValue.toLocaleString() : tx.totalValue}</span>
                    )}
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

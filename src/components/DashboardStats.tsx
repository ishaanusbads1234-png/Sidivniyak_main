/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useInventory } from "../context/InventoryContext";
import { Sparkles, Package, AlertTriangle, History } from "lucide-react";

interface DashboardStatsProps {
  onMetricClick?: (metric: "products" | "stock" | "low_stock" | "logs") => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ onMetricClick }) => {
  const { items, ledger, calculateStock } = useInventory();

  const activeItemsCount = items.length;
  const totalAuditEvents = ledger.length;

  let totalAggregateStockUnits = 0;
  let itemsLowOnStock = 0;

  items.forEach((item) => {
    const currentQty = calculateStock(item.id);
    totalAggregateStockUnits += currentQty;
    if (currentQty <= item.lowStockThreshold) {
      itemsLowOnStock++;
    }
  });

  const handleCardClick = (metric: "products" | "stock" | "low_stock" | "logs") => {
    if (metric === "products") {
      console.log("Total Products clicked");
    } else if (metric === "stock") {
      console.log("Total Stock clicked");
    } else if (metric === "low_stock") {
      console.log("Items Running Out clicked");
    } else if (metric === "logs") {
      console.log("History Logs clicked");
    }
    if (onMetricClick) {
      onMetricClick(metric);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* 1. Total Products */}
      <div 
        id="stat-active-items" 
        role="button"
        tabIndex={0}
        onClick={() => handleCardClick("products")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleCardClick("products");
          }
        }}
        className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-850/80 cursor-pointer active:scale-[0.97] transition-all duration-150 select-none"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-medium">Total Products</span>
          <Sparkles className="h-3.5 w-3.5 text-pink-400" />
        </div>
        <p className="text-lg font-bold font-mono text-pink-200">{activeItemsCount}</p>
        <span className="text-[9px] text-slate-500 font-mono">Cosmetics cataloged</span>
      </div>

      {/* 2. Total Stock in Shop */}
      <div 
        id="stat-aggregate-units" 
        role="button"
        tabIndex={0}
        onClick={() => handleCardClick("stock")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleCardClick("stock");
          }
        }}
        className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-850/80 cursor-pointer active:scale-[0.97] transition-all duration-150 select-none"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-medium">Total Stock in Shop</span>
          <Package className="h-3.5 w-3.5 text-sky-400" />
        </div>
        <p className="text-lg font-bold font-mono text-white">{totalAggregateStockUnits}</p>
        <span className="text-[9px] text-slate-500 font-mono">Available items</span>
      </div>

      {/* 3. Items Running Out */}
      <div 
        id="stat-low-stock" 
        role="button"
        tabIndex={0}
        onClick={() => handleCardClick("low_stock")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleCardClick("low_stock");
          }
        }}
        className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-850/80 cursor-pointer active:scale-[0.97] transition-all duration-150 select-none"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-medium">Items Running Out</span>
          <AlertTriangle className={`h-3.5 w-3.5 ${itemsLowOnStock > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <p className={`text-lg font-bold font-mono ${itemsLowOnStock > 0 ? "text-amber-400" : "text-emerald-400"}`}>
          {itemsLowOnStock}
        </p>
        <span className="text-[9px] text-slate-500 font-mono">Needs re-order soon</span>
      </div>

      {/* 4. History Logs */}
      <div 
        id="stat-audit-depth" 
        role="button"
        tabIndex={0}
        onClick={() => handleCardClick("logs")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleCardClick("logs");
          }
        }}
        className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-850/80 cursor-pointer active:scale-[0.97] transition-all duration-150 select-none"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-medium">History Logs</span>
          <History className="h-3.5 w-3.5 text-purple-400" />
        </div>
        <p className="text-lg font-bold font-mono text-purple-400">{totalAuditEvents}</p>
        <span className="text-[9px] text-slate-500 font-mono">Total sales/purchases</span>
      </div>
    </div>
  );
};

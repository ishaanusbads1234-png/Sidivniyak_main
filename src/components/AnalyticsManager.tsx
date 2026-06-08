/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { TrendingUp, TrendingDown, DollarSign, Box, Percent, ArrowUpRight, Flame } from "lucide-react";

export const AnalyticsManager: React.FC = () => {
  const { items, sales, expenses, calculateStock, ledger } = useInventory();
  const [metricTab, setMetricTab] = useState<"revenue" | "inventory" | "top">("revenue");

  // 1. FINANCIAL COMPUTATIONS
  const totalRevenue = sales
    .filter((s) => !s.isCancelled)
    .reduce((sum, s) => sum + s.grandTotal, 0);

  // Profit calculation: (Sale Price - Cost Price) per unit sold
  const totalProfit = sales
    .filter((s) => !s.isCancelled)
    .reduce((sum, s) => {
      const saleMargin = s.items.reduce((margin, lineItem) => {
        // Find cost price
        const itemObj = items.find((i) => i.id === lineItem.itemId);
        const costPrice = itemObj?.costPrice || 100;
        // profit = lineItem.total_collected - costPrice * quantity
        // item rate has markup of 35%, rate * qty is cost.
        const lineProfit = lineItem.total - (costPrice * lineItem.quantity);
        return margin + lineProfit;
      }, 0);
      return sum + saleMargin;
    }, 0);

  const totalStoreExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Net earnings after expense subtraction
  const netProfit = totalProfit - totalStoreExpenses;

  // Inventory valuation: currentQty * cost
  const totalValuation = items.reduce((sum, item) => {
    const qty = calculateStock(item.id);
    const cost = item.costPrice || 100;
    return sum + (qty * cost);
  }, 0);

  // 2. PRODUCT PERFORMANCE RANKING
  const getProductSalesPerformance = () => {
    // Map of itemId -> quantity sold
    const salesMap: Record<string, number> = {};
    sales
      .filter((s) => !s.isCancelled)
      .flatMap((s) => s.items)
      .forEach((item) => {
        salesMap[item.itemId] = (salesMap[item.itemId] || 0) + item.quantity;
      });

    return items.map((item) => {
      const soldQty = salesMap[item.id] || 0;
      const profit = soldQty * ((item.costPrice || 100) * 0.35); // 35 % default profit margins
      return {
        ...item,
        soldQty,
        estimatedProfit: Math.round(profit),
        revenue: Math.round(soldQty * ((item.costPrice || 100) * 1.35))
      };
    }).sort((a, b) => b.soldQty - a.soldQty);
  };

  const rankedProducts = getProductSalesPerformance();
  const topProducts = rankedProducts.slice(0, 4);

  // Low Stock Items list
  const lowStockProducts = items
    .map(i => ({ ...i, currentStock: calculateStock(i.id) }))
    .filter(i => i.currentStock <= i.lowStockThreshold)
    .sort((a, b) => a.currentStock - b.currentStock);

  // 3. GENERATE COMPARATIVE SALES VS PROCUREMENT DATA FOR TRENDING
  // Let's create a beautiful custom SVG graph mapping the last 6 logged transactions
  const getTrendData = () => {
    const latestSales = sales.filter(s => !s.isCancelled).slice(-5).map(s => ({
      label: s.invoiceNumber.replace("SDV-SL-", "S-"),
      value: s.grandTotal,
      type: "Sale"
    }));

    const latestExpenses = expenses.slice(-5).map(e => ({
      label: e.description.substring(0, 6) + "..",
      value: e.amount,
      type: "Expense"
    }));

    const combined = [...latestSales, ...latestExpenses].slice(-6);
    return combined;
  };

  const trendData = getTrendData();
  const maxTrendValue = Math.max(...trendData.map(d => d.value), 1000);

  return (
    <div className="space-y-4">
      {/* TRIPLE FINANCIAL KIP SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono select-none">
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-center">
          <span className="text-slate-500 block text-[7px] uppercase">TOTAL SALES REVENUE</span>
          <strong className="text-sm font-black text-white block mt-0.5">₹{totalRevenue.toLocaleString()}</strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-center">
          <span className="text-slate-500 block text-[7px] uppercase">COSMETIC GROSS MARGINS</span>
          <strong className={`text-sm font-black block mt-0.5 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{totalProfit.toLocaleString()}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-center">
          <span className="text-slate-500 block text-[7px] uppercase">NET PROFITS (AFTER EXPENSE)</span>
          <strong className={`text-sm font-black block mt-0.5 ${netProfit >= 0 ? 'text-pink-400' : 'text-rose-400'}`}>
            ₹{netProfit.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* METRIC OPTION PILLS */}
      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[8px] font-mono justify-between">
        <button
          onClick={() => setMetricTab("revenue")}
          className={`flex-1 py-1 text-center rounded transition uppercase cursor-pointer ${metricTab === "revenue" ? "bg-slate-800 text-pink-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Profits & Trends
        </button>
        <button
          onClick={() => setMetricTab("inventory")}
          className={`flex-1 py-1 text-center rounded transition uppercase cursor-pointer ${metricTab === "inventory" ? "bg-slate-800 text-pink-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Valuation & Low Stock
        </button>
        <button
          onClick={() => setMetricTab("top")}
          className={`flex-1 py-1 text-center rounded transition uppercase cursor-pointer ${metricTab === "top" ? "bg-slate-800 text-pink-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
        >
          Top Performers
        </button>
      </div>

      {/* VIEWPORT CONTROLLER */}

      {/* 1. PROFITS AND TRENDS WITH CUSTOM SVG BAR GRAPHS */}
      {metricTab === "revenue" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
          <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest font-bold">
            📊 Interactive Shop Transaction Ledger Trends
          </span>

          {trendData.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-8 text-center uppercase">
              No sales logs registered for charting. Try generating a sale first!
            </span>
          ) : (
            <div className="space-y-4">
              {/* Responsive SVG chart block */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 mb-2">
                  <span>₹ SCALE (MAX: ₹{maxTrendValue.toLocaleString()})</span>
                  <div className="flex gap-2 font-bold">
                    <span className="flex items-center gap-1 text-pink-400">● SALES</span>
                    <span className="flex items-center gap-1 text-rose-500 text-[7px]">■ EXPENSE</span>
                  </div>
                </div>

                {/* SVG Visual Bars */}
                <div className="flex items-end justify-around h-32 pt-2 border-b border-l border-slate-800">
                  {trendData.map((d, index) => {
                    const percentHeight = Math.max(5, (d.value / maxTrendValue) * 100);
                    const isSale = d.type === "Sale";
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute opacity-0 group-hover:opacity-100 bg-slate-900 text-slate-100 text-[7px] font-mono p-1 rounded border border-slate-700 pointer-events-none -top-8 transition-all z-20 whitespace-nowrap">
                          ₹{d.value.toLocaleString()}
                        </div>

                        {/* Interactive fill bar */}
                        <div
                          style={{ height: `${percentHeight}%` }}
                          className={`w-4 sm:w-6 rounded-t transition-all group-hover:brightness-125 ${isSale ? 'bg-pink-500 shadow-md' : 'bg-rose-600'}`}
                        />
                        <span className="text-[6.5px] font-mono text-slate-500 mt-1.5 truncate max-w-[40px]">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STATS RATIO SUMMARY */}
              <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[8px] font-mono text-slate-400 uppercase leading-relaxed font-bold">
                <div className="flex justify-between">
                  <span>EXPENSE-TO-REVENUE RATIO:</span>
                  <span className="text-pink-400">
                    {totalRevenue > 0 ? Math.round((totalStoreExpenses / totalRevenue) * 100) : 0}% OVERHEADS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. VALUATION AND LOW STOCK METRICS */}
      {metricTab === "inventory" && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                💼 TOTAL SHOP CAPITAL VALUATION
              </span>
              <span className="text-emerald-400 text-[10px] font-mono font-black font-sans">
                ₹{totalValuation.toLocaleString()}
              </span>
            </div>
            <p className="text-[7.5px] text-slate-500 font-mono uppercase">
              Accumulated cost price valuation of all physical products inside the cosmetics register database.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="block text-[8.5px] font-mono text-amber-400 uppercase tracking-widest font-bold">
              ⚠️ EXHAUSTED LOW STOCK WARNS
            </span>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
              {lowStockProducts.length === 0 ? (
                <span className="block text-slate-600 text-[8.5px] font-mono py-2 text-center uppercase font-bold">
                  ✓ Outstanding! All inventory stock margins are perfect.
                </span>
              ) : (
                lowStockProducts.map(p => (
                  <div key={p.id} className="p-2 bg-slate-950 border border-amber-500/30 rounded flex justify-between items-center text-[8.5px] font-mono">
                    <div>
                      <strong className="text-slate-200">{p.name}</strong>
                      <span className="text-slate-500 block text-[7px]">SKU: {p.sku} • threshold min: {p.lowStockThreshold}</span>
                    </div>
                    <span className="text-amber-400 font-extrabold text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {p.currentStock} left!
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TOP SELLERS PERFORMANCE LIST */}
      {metricTab === "top" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
          <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-1 font-bold">
            👑 CUSTOMER FAVORITES (TOP PRODUCTS ACCORDING TO UNITS SHIPPED)
          </span>

          <div className="space-y-1.5">
            {topProducts.map((p, idx) => (
              <div key={p.id} className="p-2 bg-slate-950 border border-slate-850 rounded flex items-center justify-between text-[8px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 bg-pink-500/20 border border-pink-500/30 rounded flex items-center justify-center text-pink-400 font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <strong className="text-slate-200">{p.name}</strong>
                    <span className="text-slate-500 block text-[7px]">Sku: {p.sku} • Cost Price: ₹{p.costPrice}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-emerald-400 font-extrabold block text-[9px]">{p.soldQty} Sold</span>
                  <span className="text-slate-500 text-[6.5px]">Profit: ₹{p.estimatedProfit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

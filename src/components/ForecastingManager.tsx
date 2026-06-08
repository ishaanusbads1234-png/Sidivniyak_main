/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useInventory } from "../context/InventoryContext";
import { Sparkles, Calendar, RotateCcw, AlertTriangle, ShieldCheck, HeartCrack, ChevronRight } from "lucide-react";

export const ForecastingManager: React.FC = () => {
  const { items, sales, calculateStock } = useInventory();

  // Find non-cancelled sale invoices
  const validSales = sales.filter(s => !s.isCancelled);

  // Helper: calculate forecasting velocity metrics for a product item
  const calculateItemVelocity = (itemId: string, currentQty: number) => {
    // Collect all sales quantities of this product. Let's look at history span
    const soldLines = validSales.flatMap(s => 
      s.items.filter(li => li.itemId === itemId).map(li => ({
        qty: li.quantity,
        saleDate: s.saleDate
      }))
    );

    const totalSoldQty = soldLines.reduce((sum, sl) => sum + sl.qty, 0);

    // If no sales, velocity is 0
    if (soldLines.length === 0) {
      return {
        dailyAvg: 0,
        weeklyAvg: 0,
        monthlyAvg: 0,
        daysRemaining: "INSUFFICIENT DATA",
        recommendation: "Hold Reorder",
        hasData: false
      };
    }

    // Determine oldest transaction date to compute actual elapsed velocity days
    const saleDates = soldLines.map(sl => new Date(sl.saleDate).getTime());
    const minDateTs = Math.min(...saleDates);
    const maxDateTs = Math.max(...saleDates);
    
    // Calculate elapsed span, minimum 1 day to prevent divide-by-zero
    const elapsedDays = Math.max(1, Math.round((maxDateTs - minDateTs) / (24 * 3600 * 1000))) + 4; // Add a smoothing padding

    const dailyAvg = parseFloat((totalSoldQty / elapsedDays).toFixed(2));
    const weeklyAvg = parseFloat((dailyAvg * 7).toFixed(1));
    const monthlyAvg = parseFloat((dailyAvg * 30).toFixed(1));

    // Remaining shelf duration estimation
    let daysRemaining: string | number = "∞ DAYS";
    let recommendation = "Maintain Lot";

    if (dailyAvg > 0) {
      const remainingVal = Math.round(currentQty / dailyAvg);
      daysRemaining = remainingVal;

      if (remainingVal <= 10) {
        recommendation = "URGENT REORDER!";
      } else if (remainingVal <= 30) {
        recommendation = "Queue Purchase Order";
      } else {
        recommendation = "Adequate Lot";
      }
    }

    return {
      dailyAvg,
      weeklyAvg,
      monthlyAvg,
      daysRemaining,
      recommendation,
      hasData: soldLines.length >= 2 // Warn if very few transaction data points exist
    };
  };

  return (
    <div className="space-y-4">
      {/* EXPLAINER TOP WARNING CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-[8.5px] font-mono leading-relaxed uppercase">
        <span className="text-pink-400 font-bold block text-[9.5px]">🔮 Intelligent Cosmetics Shelf Forecaster</span>
        <p className="text-slate-400">
          This system aggregates the chronological velocity of sales transaction entries in your store to estimate remaining shelf lifetime and generate automated reordering recommendations.
        </p>
      </div>

      {/* FORECAST LISTING GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest font-bold">
          📈 Automated Procurement Velocity Reports
        </span>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item) => {
            const currentStock = calculateStock(item.id);
            const velocity = calculateItemVelocity(item.id, currentStock);

            // Reorder pill styles
            let recoPill = "bg-slate-950 text-slate-400 border border-slate-800";
            if (velocity.recommendation === "URGENT REORDER!") recoPill = "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold animate-pulse";
            if (velocity.recommendation === "Queue Purchase Order") recoPill = "bg-amber-500/10 text-amber-400 border border-amber-500/30";
            if (velocity.recommendation === "Adequate Lot") recoPill = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

            return (
              <div key={item.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg space-y-2 text-[8.5px] font-mono relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-slate-905 pb-1">$
                  <div>
                    <h6 className="text-[9px] font-bold text-white font-sans">{item.name}</h6>
                    <span className="text-slate-500 text-[7px] mt-0.5 block">SKU: {item.sku} • Current Quantity: {currentStock} {item.unit}</span>
                  </div>

                  <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-bold uppercase ${recoPill}`}>
                    {velocity.recommendation}
                  </span>
                </div>

                {!velocity.hasData ? (
                  <div className="flex items-center gap-1.5 text-slate-500 bg-slate-900/30 p-1.5 rounded border border-dashed border-slate-900 text-[7.5px] font-mono uppercase">
                    <HeartCrack className="h-3 w-3 text-pink-500 shrink-0" />
                    <span>Insufficient sales logged to forecast trends accurately. Default metrics cached.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1 text-center text-[7.5px] text-slate-400">
                    <div className="bg-slate-900 p-1 rounded border border-slate-900/60">
                      <span className="text-slate-500 block text-[6.5px]">DAILY VELOCITY</span>
                      <strong className="text-white text-[8.5px]">{velocity.dailyAvg} {item.unit}</strong>
                    </div>
                    <div className="bg-slate-900 p-1 rounded border border-slate-900/60">
                      <span className="text-slate-500 block text-[6.5px]">WEEKLY FLOW</span>
                      <strong className="text-white text-[8.5px]">{velocity.weeklyAvg} {item.unit}</strong>
                    </div>
                    <div className="bg-slate-900 p-1 rounded border border-slate-900/60">
                      <span className="text-slate-500 block text-[6.5px]">MONTHLY RUN</span>
                      <strong className="text-white text-[8.5px]">{velocity.monthlyAvg} {item.unit}</strong>
                    </div>
                    <div className="bg-slate-900 p-1 rounded border border-slate-900/60">
                      <span className="text-slate-500 block text-[6.5px]">EST DAYS REMAINING</span>
                      <strong className={`text-[8.5px] ${velocity.daysRemaining !== "∞ DAYS" && Number(velocity.daysRemaining) <= 15 ? 'text-rose-450 font-black animate-pulse' : 'text-slate-200'}`}>
                        {velocity.daysRemaining === "∞ DAYS" ? "∞ DAYS" : `${velocity.daysRemaining} days`}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

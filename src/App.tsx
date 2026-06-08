/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { DashboardStats } from "./components/DashboardStats";
import { ItemCatalog } from "./components/ItemCatalog";
import { LedgerLogs } from "./components/LedgerLogs";
import { ManagerGate } from "./components/ManagerGate";
import { ManagerConsole } from "./components/ManagerConsole";

// Import custom sub-modules
import { StockDetailsModal } from "./components/StockDetailsModal";
import { ProductRegistryModal } from "./components/ProductRegistryModal";
import { ManualStockEntry } from "./components/ManualStockEntry";
import { StockTallyTool } from "./components/StockTallyTool";
import { PosTerminal } from "./components/PosTerminal";
import { BillsHistoryList } from "./components/BillsHistoryList";
import { ExpenseSheet } from "./components/ExpenseSheet";

import { 
  Sparkles, Settings, Shield, Lock, Compass, Heart,
  DollarSign, Activity, FileText, CheckSquare, PlusCircle, ArrowUpRight
} from "lucide-react";
import { InventoryItem } from "./types";

function MainAppLayout() {
  const { 
    isManagerMode, setManagerMode, calculateStock, ledger, verifyAndSetManagerMode
  } = useInventory();
  
  // Dynamic Tab Routing state
  const [activeTab, setActiveTab] = useState<"stock" | "pos" | "bills" | "expense" | "reports">("stock");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Router stats and filter states
  const [managerActiveTab, setManagerActiveTab] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "low-stock">("all");

  const handleMetricClick = (metric: "products" | "stock" | "low_stock" | "logs") => {
    if (!isManagerMode) {
      if (metric === "products") {
        setActiveTab("stock");
        setCatalogFilter("all");
      } else if (metric === "stock") {
        setActiveTab("stock");
        setCatalogFilter("all");
      } else if (metric === "low_stock") {
        setActiveTab("stock");
        setCatalogFilter("low-stock");
      } else if (metric === "logs") {
        setActiveTab("stock");
        setTimeout(() => {
          const el = document.getElementById("ledger-logs-section");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 120);
      }
    } else {
      if (metric === "products") {
        setActiveTab("stock");
        setCatalogFilter("all");
      } else if (metric === "stock") {
        setActiveTab("reports");
        setManagerActiveTab("reports");
      } else if (metric === "low_stock") {
        setActiveTab("reports");
        setManagerActiveTab("forecasting");
      } else if (metric === "logs") {
        setActiveTab("reports");
        setManagerActiveTab("audits");
      }
    }
  };

  // Focus modal states
  const [viewingStockItem, setViewingStockItem] = useState<InventoryItem | null>(null);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [isManualInflowOpen, setIsManualInflowOpen] = useState(false);
  const [isTallyOpen, setIsTallyOpen] = useState(false);

  // PASSWORD GATE OVERLAY MODAL STATES
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalPassword, setModalPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };

  return (
    <div 
      id="phone-container" 
      className="h-screen w-full flex flex-col bg-slate-950 text-slate-100 relative font-sans overflow-hidden"
    >
      {/* Absolute background visual ambient details */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* MOBILE CUSTOM HEADER BAR */}
      <header className="shrink-0 bg-slate-950 px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
          <div className="h-6 w-6 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0 animate-pulse">
            <Heart className="h-3.5 w-3.5 fill-pink-500" />
          </div>
          <div className="truncate">
            <h1 className="text-[11px] font-black tracking-widest font-mono text-white flex items-center gap-1">
              SIDIVNIYAK <span className="text-[8.5px] text-pink-450 font-bold truncate">• BEAUTY</span>
            </h1>
            <p className="text-[7.5px] text-slate-400 font-mono tracking-tight uppercase truncate">
              In-Store Cosmetics SystemMH
            </p>
          </div>
        </div>

        {/* INTERACTIVE ACCESS SELECTION PILLS */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800/80 z-20 shrink-0 select-none">
          <button
            onClick={() => {
              setManagerMode(false);
            }}
            className={`px-2 py-1 text-[7.5px] font-bold rounded font-mono transition cursor-pointer flex items-center gap-0.5 ${
              !isManagerMode
                ? "bg-slate-800 text-pink-400 border border-pink-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="h-2 w-2" /> STAFF
          </button>
          <button
            onClick={() => {
              if (!isManagerMode) {
                setIsAuthModalOpen(true);
              }
            }}
            className={`px-2 py-1 text-[7.5px] font-bold rounded font-mono transition cursor-pointer flex items-center gap-0.5 ${
              isManagerMode
                ? "bg-rose-500/20 text-rose-450 border border-rose-500/40 font-black animate-pulse"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="h-2 w-2" /> OVERSEER
          </button>
        </div>
      </header>

      {/* SUB-LINK HELPER OPERATIONS FOR WORKERS (1 Button clicks to key screens) */}
      <div className="shrink-0 bg-slate-900 px-3 py-1.5 border-b border-slate-850 flex items-center justify-between text-[7px] font-mono uppercase tracking-wider select-none shrink-0 gap-1 overflow-x-auto">
        <button
          onClick={() => setIsManualInflowOpen(true)}
          className="text-emerald-400 hover:text-emerald-300 font-black flex items-center gap-0.5"
          type="button"
        >
          <PlusCircle className="h-2.5 w-2.5" /> [📥 INWARD PROCUREMENT]
        </button>

        <button
          onClick={() => setIsTallyOpen(true)}
          className="text-pink-300 hover:text-white font-black flex items-center gap-0.5"
          type="button"
        >
          <CheckSquare className="h-2.5 w-2.5" /> [📊 PHYSICAL TALLY]
        </button>

        <span className="text-slate-500 flex items-center gap-0.5">
          <Compass className="h-2.5 w-2.5 text-pink-500" /> POS CORE: ONLINE
        </span>
      </div>

      {/* SCROLLABLE VIEWPORT FOR MOBILE COMFORT */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-slate-950">
        
        {/* TAB 1: PRODUCT SKUs CATALOG */}
        {activeTab === "stock" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4 scrollbar-none animate-fade-in-up">
            <DashboardStats onMetricClick={handleMetricClick} />

            <ItemCatalog
              onSelectItem={handleSelectItem}
              selectedItemId={selectedItem?.id || null}
              onOpenAddManagerGate={() => setIsRegistryOpen(true)}
              onViewStockDetails={(item) => setViewingStockItem(item)}
              onRegisterSku={() => setIsRegistryOpen(true)}
              filterMode={catalogFilter}
              onClearFilter={() => setCatalogFilter("all")}
            />

            {/* Selected focus item details displays in-place */}
            {selectedItem ? (
              <div id="telemetry-item-focus-card" className="bg-slate-900 rounded-xl border border-pink-500/30 p-2.5 space-y-2.5 relative overflow-hidden leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="text-[7.5px] font-mono text-pink-400 uppercase tracking-widest font-black">Cosmetics Ledger Passbook</span>
                  <button 
                    onClick={() => setSelectedItem(null)} 
                    className="text-[8.5px] hover:text-white text-slate-400 font-mono cursor-pointer"
                  >
                    [CLOSE DETAILS]
                  </button>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-white font-sans">{selectedItem.name}</h4>
                  <p className="text-[9.5px]/relaxed text-slate-405 font-sans mt-0.5">{selectedItem.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <span className="block text-[7px] text-slate-500 uppercase">Shelf location</span>
                    <span className="text-slate-300 font-bold">{selectedItem.location || "Rack 1-A"}</span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850 text-right">
                    <span className="block text-[7px] text-slate-500 uppercase">Current Stock balance</span>
                    <span className={`text-[10px] font-black ${calculateStock(selectedItem.id) <= selectedItem.lowStockThreshold ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {calculateStock(selectedItem.id)} PCS
                    </span>
                  </div>
                </div>

                {/* VISUAL STOCK MOVEMENT TIMELINE NODES */}
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <span className="text-[7.5px] text-slate-400 font-bold uppercase block tracking-widest">STOCK TRANSACTION HISTORY:</span>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 space-y-2 font-mono text-[8.5px]">
                    <div className="space-y-1.5 pr-1">
                      {(() => {
                        const filteredTxs = ledger
                          .filter((t) => t.itemId === selectedItem.id)
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        
                        let runBalance = selectedItem.initialStock;
                        const txsWithBal = filteredTxs.map((t) => {
                          runBalance += t.changeQty;
                          return { ...t, runningBalance: runBalance };
                        });
                        
                        const displayTxs = [...txsWithBal].reverse();

                        if (displayTxs.length === 0) {
                          return (
                            <span className="block text-center text-slate-650 text-[7px] py-2">
                              No historic ledger events logged
                            </span>
                          );
                        }

                        return displayTxs.map((tx) => {
                          const isPositive = tx.changeQty >= 0;
                          return (
                            <div key={tx.id} className="flex items-start gap-1 pb-1.5 border-b border-slate-900 last:border-0 last:pb-0">
                              <span className={`font-mono font-black shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-450'}`}>
                                [{isPositive ? `+${tx.changeQty}` : tx.changeQty} pcs]
                              </span>
                              <div className="flex-1 min-w-0 pr-1">
                                <p className="text-slate-350 font-bold truncate leading-none">{tx.reason}</p>
                                <span className="text-[7px] text-slate-500 block leading-none mt-1">By operator: {tx.operatorName} • balance: {tx.runningBalance}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-slate-900/40 rounded-xl border border-dashed border-slate-850 py-3 text-center text-[8.5px] text-slate-500 font-mono">
                * Click on any cosmetic card above to audit its stock flow ledgers
              </div>
            )}

            {/* General audit streams */}
            <LedgerLogs />

          </div>
        )}

        {/* TAB 2: ACTIVE POINT-OF-SALE BILLING TERMINAL */}
        {activeTab === "pos" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4 scrollbar-none animate-fade-in-up">
            <PosTerminal />
          </div>
        )}

        {/* TAB 3: INWARD SUPPLIER BILLS & OCR LOADER */}
        {activeTab === "bills" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4 scrollbar-none animate-fade-in-up">
            <BillsHistoryList />
          </div>
        )}

        {/* TAB 4: COMPASS OPERATIONAL EXPENDITURE PASSOOK */}
        {activeTab === "expense" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4 scrollbar-none animate-fade-in-up">
            <ExpenseSheet />
          </div>
        )}

        {/* TAB 5: SUPERVISOR SECURITY CONTROL DESK */}
        {activeTab === "reports" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4 scrollbar-none animate-fade-in-up">
            <ManagerGate
              title="Supervisor Control Authorized Credentials Only"
              description="Financial metrics modification, wholesale roster profiles, backup restores, and system audits are restricted."
            >
              <div className="space-y-3 text-[9px] font-mono">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-mono leading-relaxed flex justify-between items-center whitespace-normal">
                  <div>
                    <strong>ADMIN ELEVATION DECLARED:</strong> <br />
                    Full inventory cataloging and ledger correction is unlocked.
                  </div>
                  {isManagerMode && (
                    <button
                      onClick={() => setManagerMode(false)}
                      className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/35 text-rose-450 text-[8px] rounded hover:bg-rose-500/30 font-bold uppercase transition"
                    >
                      LOCK SCREEN
                    </button>
                  )}
                </div>

                <ManagerConsole panelTab={managerActiveTab} setPanelTab={setManagerActiveTab} />
              </div>
            </ManagerGate>
          </div>
        )}

      </main>

      {/* THUMB-FRIENDLY BOTTOM PHONE NAVIGATION RAIL */}
      <footer className="shrink-0 bg-slate-950/95 border-t border-slate-800 p-2 pb-[env(safe-area-inset-bottom,8px)] flex items-center justify-around select-none z-40">
        <button
          onClick={() => {
            setActiveTab("stock");
            setCatalogFilter("all");
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer text-center ${
            activeTab === "stock"
              ? "text-pink-400 bg-pink-500/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Compass className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[7.5px] font-mono mt-0.5 uppercase tracking-tight font-bold">STOCK</span>
        </button>

        <button
          onClick={() => setActiveTab("pos")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer text-center ${
            activeTab === "pos"
              ? "text-pink-400 bg-pink-500/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[7.5px] font-mono mt-0.5 uppercase tracking-tight font-bold">POS</span>
        </button>

        <button
          onClick={() => setActiveTab("bills")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer text-center ${
            activeTab === "bills"
              ? "text-pink-400 bg-pink-500/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[7.5px] font-mono mt-0.5 uppercase tracking-tight font-bold">BILLS</span>
        </button>

        <button
          onClick={() => setActiveTab("expense")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer text-center ${
            activeTab === "expense"
              ? "text-pink-400 bg-pink-500/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[7.5px] font-mono mt-0.5 uppercase tracking-tight font-bold">EXPENSE</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer text-center ${
            activeTab === "reports"
              ? "text-pink-400 bg-pink-500/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="h-4.5 w-4.5 shrink-0" />
          <span className="text-[7.5px] font-mono mt-0.5 uppercase tracking-tight font-bold">REPORTS</span>
        </button>
      </footer>

      {/* FLOAT MODALS & OVERLAYS */}
      {viewingStockItem && (
        <StockDetailsModal 
          item={viewingStockItem}
          onClose={() => setViewingStockItem(null)}
        />
      )}

      {isRegistryOpen && (
        <ProductRegistryModal 
          onClose={() => setIsRegistryOpen(false)}
        />
      )}

      {isManualInflowOpen && (
        <ManualStockEntry 
          onClose={() => setIsManualInflowOpen(false)}
        />
      )}

      {isTallyOpen && (
        <StockTallyTool 
          onClose={() => setIsTallyOpen(false)}
          isManager={isManagerMode}
          onUnlockManager={() => {
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* PASSWORD GATE PROMPT MODAL */}
      {isAuthModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-slate-900 border border-pink-500/40 rounded-2xl p-4 shadow-2xl space-y-4 font-mono text-[9px]">
            <div className="mx-auto w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 animate-pulse shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-xs font-bold font-mono tracking-wider text-pink-400 uppercase">
                Supervisor Code Verify
              </h3>
              <p className="text-[8.5px] text-slate-405 leading-normal">
                Administrative security authentication is required to modify cosmetic stock, tally yesterday's register levels, and edit ledger details.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matched = verifyAndSetManagerMode(modalPassword);
                if (matched) {
                  setIsAuthModalOpen(false);
                  setModalPassword("");
                  setModalError(null);
                } else {
                  setModalError("INCORRECT PASSWORD");
                }
              }}
              className="space-y-3"
            >
              <input
                type="password"
                placeholder="Enter password..."
                value={modalPassword}
                onChange={(e) => {
                  setModalPassword(e.target.value);
                  if (modalError) setModalError(null);
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-white text-center focus:outline-none focus:border-pink-500 tracking-widest"
                autoFocus
              />

              {modalError && (
                <p className="text-[8.5px] text-rose-400 text-center font-mono font-bold">
                  ⚠️ {modalError}
                </p>
              )}

              <div className="flex gap-2 text-[9px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setModalPassword("");
                    setModalError(null);
                  }}
                  className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded bg-pink-650 hover:bg-pink-650 text-white cursor-pointer transition select-none"
                  id="btn-gate-submit"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <MainAppLayout />
    </InventoryProvider>
  );
}

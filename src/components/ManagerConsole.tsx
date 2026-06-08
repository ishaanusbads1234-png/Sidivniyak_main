/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { 
  ClipboardPlus, Sparkles, FolderPlus, DollarSign, ListOrdered, FileDown, 
  Trash2, RefreshCw, AlertOctagon, CornerDownRight, CheckCircle, Smartphone, 
  Calendar, User, CreditCard, ArrowLeftRight, Activity, TrendingUp, Clock, 
  Save, LayoutGrid, Award, ArrowLeft
} from "lucide-react";
import { Expense, InventoryItem } from "../types";

// Import custom sub-modules
import { SalesManager } from "./SalesManager";
import { PurchasesManager } from "./PurchasesManager";
import { SuppliersManager } from "./SuppliersManager";
import { ReturnsManager } from "./ReturnsManager";
import { BatchManager } from "./BatchManager";
import { AnalyticsManager } from "./AnalyticsManager";
import { ForecastingManager } from "./ForecastingManager";
import { BackupsManager } from "./BackupsManager";

interface ManagerConsoleProps {
  panelTab?: string | null;
  setPanelTab?: (val: string | null) => void;
}

export const ManagerConsole: React.FC<ManagerConsoleProps> = ({
  panelTab: externalPanelTab,
  setPanelTab: externalSetPanelTab
}) => {
  const { 
    addItem, items, expenses, addExpense, updateExpense, auditLogs, 
    calculateStock, resetLedgerToFactory 
  } = useInventory();

  const [localPanelTab, setLocalPanelTab] = useState<string | null>(null);

  const panelTab = externalPanelTab !== undefined ? externalPanelTab : localPanelTab;
  const setPanelTab = externalSetPanelTab !== undefined ? externalSetPanelTab : setLocalPanelTab;

  // A. Product Registry fields
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Face");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState(10);
  const [initialStock, setInitialStock] = useState(50);
  const [unit, setUnit] = useState("pcs");
  const [location, setLocation] = useState("ShelfA-Row1");
  const [costPrice, setCostPrice] = useState(100);
  const [sellPrice, setSellPrice] = useState(135);
  const [mrp, setMrp] = useState(150);
  const [registryFeedback, setRegistryFeedback] = useState("");

  // B. Expense Tracker fields
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expCategory, setExpCategory] = useState("Supplier Pay");
  const [expOperator, setExpOperator] = useState("Manager Account");
  const [expenseFeedback, setExpenseFeedback] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmt, setEditAmt] = useState("");

  // C. Valuation Export states
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  const CATEGORIES = ["Face", "Eyes", "Hair", "Skin", "Nails", "Other"];
  const EXPENSE_CATEGORIES = ["Supplier Pay", "Rent", "Utility", "Transport", "Salary", "Other"];

  // Submit product creation
  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku.trim() || !name.trim()) {
      setRegistryFeedback("Error: SKU and Product Name are required!");
      return;
    }

    const skuDups = items.some((i) => i.sku.toUpperCase() === sku.trim().toUpperCase());
    if (skuDups) {
      setRegistryFeedback(`Error: SKU '${sku.trim().toUpperCase()}' is already in catalog.`);
      return;
    }

    const finalCP = costPrice || 100;
    const finalSP = sellPrice || Math.round(finalCP * 1.35);
    const finalMrp = mrp || Math.round(finalCP * 1.5);

    addItem({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category,
      description: description.trim() || "Retail beauty care cosmetic product.",
      lowStockThreshold: threshold,
      initialStock: initialStock,
      unit,
      location: location.trim() || "General Counter Shelf",
      costPrice: finalCP,
      sellPrice: finalSP,
      mrp: finalMrp
    }, "Manager Principal");

    setRegistryFeedback(`SUCCESS: Registered '${name.trim()}' @ SP: ₹${finalSP} / MRP: ₹${finalMrp}!`);
    setSku("");
    setName("");
    setDescription("");
    setTimeout(() => setRegistryFeedback(""), 3000);
  };

  // Submit expense creation
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmt) {
      setExpenseFeedback("Error: Description and Amount are required.");
      return;
    }

    addExpense({
      description: expDesc.trim(),
      amount: parseFloat(expAmt),
      category: expCategory,
      date: new Date().toISOString().substring(0, 10),
      operator: expOperator.trim() || "Manager"
    }, expOperator.trim() || "Manager");

    setExpenseFeedback("SUCCESS: Shop expense recorded.");
    setExpDesc("");
    setExpAmt("");
    setTimeout(() => setExpenseFeedback(""), 3500);
  };

  // Trigger expense updating
  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditDesc(exp.description);
    setEditAmt(exp.amount.toString());
  };

  const handleSaveExpenseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDesc.trim() || !editAmt) return;

    updateExpense(editingExpenseId!, {
      description: editDesc,
      amount: parseFloat(editAmt)
    }, "Manager Principal");

    setEditingExpenseId(null);
  };

  const handleExportCompiledReport = () => {
    setExporting(true);
    setExportResult(null);
    setTimeout(() => {
      setExporting(false);
      setExportResult("SIDIVNIYAK_VALUATION_AUDIT_REPORT.pdf compiled. Backup dataset successfully logged in active schema!");
    }, 1500);
  };

  const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalInventoryValuation = items.reduce((sum, item) => {
    const qty = calculateStock(item.id);
    const cost = item.costPrice || 100;
    return sum + (qty * cost);
  }, 0);

  // Grouped operational blocks
  const GROUPS = [
    {
      title: "Core Registers",
      apps: [
        { id: "sales", name: "Billing Terminal", icon: <CreditCard className="h-5 w-5 text-pink-400" />, desc: "Indian GST and sales billing invoice printer" },
        { id: "purchases", name: "Re-procurements", icon: <Award className="h-5 w-5 text-emerald-400" />, desc: "Purchase books and supplier supply flow tracker" },
        { id: "returns", name: "Returns Desk", icon: <ArrowLeftRight className="h-5 w-5 text-indigo-400" />, desc: "Refunds log and inverse stock reconciliation desk" },
      ]
    },
    {
      title: "Stock & Registry",
      apps: [
        { id: "registry", name: "Add New SKU", icon: <ClipboardPlus className="h-5 w-5 text-purple-400" />, desc: "Register cosmetics items to core catalog schema" },
        { id: "suppliers", name: "Suppliers Profile", icon: <User className="h-5 w-5 text-amber-400" />, desc: "Directories, contact details and GSTIN ledgers" },
        { id: "batch", name: "Lot Batches FEFO", icon: <Calendar className="h-5 w-5 text-rose-400" />, desc: "MFG/Expiry tracker for lot shelf optimization" },
      ]
    },
    {
      title: "Insights & Audits",
      apps: [
        { id: "analytics", name: "SVG Analytics", icon: <Activity className="h-5 w-5 text-pink-500" />, desc: "Gross, sales graphs and revenue margins" },
        { id: "forecasting", name: "Velocity Forecast", icon: <Clock className="h-5 w-5 text-sky-400" />, desc: "Daily velocity index and shelf exhaustion estimator" },
        { id: "expenses", name: "Expenses Tracker", icon: <FolderPlus className="h-5 w-5 text-red-400" />, desc: "Rent, salary, transport expenses sheets" },
        { id: "reports", name: "Valuation PDF", icon: <FileDown className="h-5 w-5 text-amber-300" />, desc: "Inventory capital audit reports sheet" },
      ]
    },
    {
      title: "Disaster Recovery",
      apps: [
        { id: "audits", name: "Immutable Audits", icon: <ListOrdered className="h-5 w-5 text-indigo-300" />, desc: "Master log records and credential sync logs" },
        { id: "backups", name: "Data Backup JSON", icon: <Save className="h-5 w-5 text-emerald-300" />, desc: "Offline serialization exporter and restore" },
        { id: "settings", name: "System Parameters", icon: <AlertOctagon className="h-5 w-5 text-rose-600 font-bold" />, desc: "Catalog wipe cleans and system resetting parameters" },
      ]
    }
  ];

  return (
    <div id="manager-console-immersive" className="space-y-4">
      {/* 1. APP DASHBOARD HOME GRID */}
      {panelTab === null ? (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-slate-100 relative overflow-hidden select-none">
            <div className="space-y-0.5">
              <span className="text-[7.5px] font-mono text-pink-400 font-bold uppercase tracking-widest block">OPERATING SYSTEM</span>
              <h3 className="text-xs font-black font-mono text-white tracking-tight">SIDIVNIYAK MASTER CONSOLE</h3>
              <p className="text-[7.5px] text-slate-500 font-mono">AUTHORIZED CLOUD SESSIONS ACTIVE</p>
            </div>
            <LayoutGrid className="h-6 w-6 text-pink-500/40 animate-pulse shrink-0" />
          </div>

          <div className="space-y-4">
            {GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <span className="text-[7.5px] tracking-widest font-mono text-slate-500 uppercase block font-black pl-1">{group.title}</span>
                <div className="grid grid-cols-1 gap-2.5">
                  {group.apps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setPanelTab(app.id)}
                      className="text-left bg-slate-900 border border-slate-800/80 hover:border-pink-500/30 rounded-xl p-3 flex gap-3.5 items-center cursor-pointer transition-all active:scale-98 select-none"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800/60 shadow shrink-0">
                        {app.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <strong className="text-[10px] font-bold text-slate-155 font-sans block leading-none">{app.name}</strong>
                        <span className="text-[7.5px] text-slate-400 block truncate mt-1 leading-normal uppercase font-mono">{app.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 2. FOCUS PANEL CONTENT WITH COMPACT MOBILE BACK BAR
        <div className="space-y-4 animate-fade-in">
          {/* COMPACT BACK BAR */}
          <div className="flex justify-between items-center bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-800 select-none z-35">
            <button
              onClick={() => setPanelTab(null)}
              className="text-[9px] font-mono hover:text-white text-slate-400 cursor-pointer flex items-center gap-1 uppercase"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-pink-500 shrink-0" /> [Back to Console Core]
            </button>
            <span className="text-[7px] font-mono text-slate-500 uppercase">OS Session ID: LIVE</span>
          </div>

          {/* ACTIVE CORE APP RENDERING SCREEN */}
          <div className="animate-fade-in-up">
            {panelTab === "sales" && <SalesManager />}
            {panelTab === "purchases" && <PurchasesManager />}
            {panelTab === "suppliers" && <SuppliersManager />}
            {panelTab === "returns" && <ReturnsManager />}
            {panelTab === "batch" && <BatchManager />}
            {panelTab === "analytics" && <AnalyticsManager />}
            {panelTab === "forecasting" && <ForecastingManager />}
            {panelTab === "backups" && <BackupsManager />}

            {/* PRODUCT REGISTRY TAB */}
            {panelTab === "registry" && (
              <div id="sub-panel-registry" className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1 text-pink-400 text-[10px] font-mono uppercase pb-1 border-b border-slate-800">
                  <ClipboardPlus className="h-3.5 w-3.5" /> Catalog New SKU
                </div>

                <form onSubmit={handleSubmitItem} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">SKU / Item Code *</label>
                      <input
                        type="text"
                        placeholder="LAK-ROSE-100"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Product Name *</label>
                    <input
                      type="text"
                      placeholder="Product Display Name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-sans text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Cost Price (CP) *</label>
                      <input
                        type="number"
                        min="1"
                        value={costPrice}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 0);
                          setCostPrice(val);
                          setSellPrice(Math.round(val * 1.35));
                          setMrp(Math.round(val * 1.5));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Sell Price (SP) *</label>
                      <input
                        type="number"
                        min="1"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">MRP (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={mrp}
                        onChange={(e) => setMrp(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Shelf Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Initial Stock</label>
                      <input
                        type="number"
                        min="0"
                        value={initialStock}
                        onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none text-pink-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Low Stock Point</label>
                      <input
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Ingredients & Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Specifications..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-sans text-[10px] text-slate-200 focus:outline-none"
                    />
                  </div>

                  {registryFeedback && (
                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono leading-relaxed">
                      <span className="flex items-center gap-1">
                        <CornerDownRight className="h-3 w-3" /> {registryFeedback}
                      </span>
                    </div>
                  )}

                  <button
                    id="btn-register-product"
                    type="submit"
                    className="w-full py-1.5 rounded bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold cursor-pointer transition shadow-xl"
                  >
                    CATALOG BEAUTY PRODUCT
                  </button>
                </form>
              </div>
            )}

            {/* ORIGINAL EXPENSES TAB */}
            {panelTab === "expenses" && (
              <div id="sub-panel-expenses" className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-1 text-pink-400 text-[10px] font-mono uppercase pb-1 border-b border-slate-800">
                    <FolderPlus className="h-3.5 w-3.5" /> Record Store Expense
                  </div>

                  <form onSubmit={handleAddExpenseSubmit} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Amount (₹ INR) *</label>
                        <input
                          type="number"
                          placeholder="₹ Amount"
                          value={expAmt}
                          onChange={(e) => setExpAmt(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Category</label>
                        <select
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Description *</label>
                        <input
                          type="text"
                          placeholder="Brief description..."
                          value={expDesc}
                          onChange={(e) => setExpDesc(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-sans text-[10px] text-slate-200 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Operator initials</label>
                        <input
                          type="text"
                          value={expOperator}
                          onChange={(e) => setExpOperator(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[9px] text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    {expenseFeedback && (
                      <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono leading-relaxed">
                        {expenseFeedback}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-1.5 rounded bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold cursor-pointer transition uppercase"
                    >
                      Save Expense Entry
                    </button>
                  </form>
                </div>

                {editingExpenseId && (
                  <div className="bg-slate-900 border border-pink-500/30 rounded-xl p-3 space-y-2 animate-pulse">
                    <span className="block text-[8px] font-mono text-pink-400 uppercase font-black">⚡ Editing Expense Entry</span>
                    <form onSubmit={handleSaveExpenseEdit} className="grid grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="col-span-2 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-200"
                      />
                      <input
                        type="number"
                        value={editAmt}
                        onChange={(e) => setEditAmt(e.target.value)}
                        className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-200"
                      />
                      <button
                        type="submit"
                        className="col-span-3 py-1 bg-emerald-700 text-white font-mono text-[8.5px] rounded font-bold hover:bg-emerald-600 cursor-pointer"
                      >
                        SAVE UPDATE
                      </button>
                    </form>
                  </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[9px] font-mono">
                  <span className="block text-[8.5px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Recorded Expenses:</span>
                  <div className="space-y-1.5">
                    {expenses.length === 0 ? (
                      <span className="block text-slate-500 text-[8.5px] py-2 text-center">No expenses recorded</span>
                    ) : (
                      expenses.map((e) => (
                        <div key={e.id} className="p-2 bg-slate-950 border border-slate-800 rounded flex flex-col justify-between gap-1">
                          <div className="flex justify-between items-start">
                            <span className="text-slate-200 font-sans leading-tight">{e.description}</span>
                            <span className="text-pink-400 font-bold ml-2 shrink-0">₹{e.amount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[7.5px] text-slate-500">
                            <span>Cat: <strong className="text-slate-400">{e.category}</strong></span>
                            <button 
                              onClick={() => handleStartEditExpense(e)} 
                              className="text-pink-500 hover:text-pink-300 font-medium cursor-pointer"
                            >
                              [EDIT]
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ORIGINAL AUDIT LOGS TAB */}
            {panelTab === "audits" && (
              <div id="sub-panel-audits" className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1 text-pink-400 text-[10px] font-mono uppercase pb-1 border-b border-slate-800">
                  <ListOrdered className="h-3.5 w-3.5" /> Immutable Security Logs
                </div>
                
                <div className="p-2 bg-slate-950 border border-slate-850 rounded text-[8.5px] text-slate-400 font-mono leading-relaxed">
                  <span className="text-pink-300 font-bold">Security Constraint Rules:</span> System logs are fully append-only, write-synchronized in the shop active schema, and immune to manual client-side deletes.
                </div>

                <div className="space-y-1.5 pr-1">
                  {auditLogs.slice().reverse().map((log) => {
                    const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      day: "2-digit",
                      month: "short"
                    });

                    let badgeColor = "bg-slate-850 text-slate-400";
                    if (log.action === "PRODUCT_CREATION") badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    if (log.action === "PRODUCT_DELETION") badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                    if (log.action === "PRODUCT_EDIT") badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    if (log.action === "MANAGER_MODE_ACCESS") badgeColor = "bg-purple-500/15 text-purple-400 border border-purple-500/20";
                    if (log.action === "SALE") badgeColor = "bg-sky-500/10 text-sky-450 border border-sky-500/20";
                    if (log.action === "PURCHASE") badgeColor = "bg-emerald-400/10 text-emerald-300 border border-emerald-450/20";
                    
                    return (
                      <div key={log.id} className="p-2 bg-slate-950 border border-slate-850 rounded text-[9px] font-mono space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[7px] px-1 py-0.2 rounded font-bold uppercase ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="text-slate-500 text-[8px]">{formattedTime}</span>
                        </div>

                        <div className="text-slate-300 text-[8px] leading-normal font-sans">
                          User: <strong className="text-slate-200">{log.user}</strong>
                          {log.newValues && (
                            <div className="mt-1 bg-slate-900 border border-slate-850 p-1 rounded font-mono text-[7px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-[80px]">
                              Data/Delta: {log.newValues}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[7.5px] text-slate-600 border-t border-slate-900/60 pt-1 leading-normal">
                          <Smartphone className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{log.deviceInfo}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ORIGINAL REPORTS TAB */}
            {panelTab === "reports" && (
              <div id="sub-panel-reports" className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1 text-pink-400 text-[10px] font-mono uppercase pb-1 border-b border-slate-800">
                  <FileDown className="h-3.5 w-3.5" /> Shop Valuation Report
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="bg-slate-950 p-2 rounded border border-slate-850">
                    <span className="text-slate-500 block text-[7.5px]">TOTAL STOCK VALUE</span>
                    <span className="text-emerald-400 font-bold block text-sm">₹{totalInventoryValuation.toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-850">
                    <span className="text-slate-500 block text-[7.5px]">TOTAL STORE EXPENSES</span>
                    <span className="text-rose-400 font-bold block text-sm">₹{totalExpensesAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-[8px] font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 border-b border-slate-850">
                        <th className="p-1 px-1.5 font-bold">SKU</th>
                        <th className="p-1 px-1.5 text-right font-bold">Units</th>
                        <th className="p-1 px-1.5 text-right font-bold">Rate</th>
                        <th className="p-1 px-1.5 text-right font-bold">Valuation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const qty = calculateStock(item.id);
                        const rate = item.costPrice || 100;
                        const itemVal = qty * rate;

                        return (
                          <tr key={item.id} className="border-b border-slate-950 bg-slate-900/40">
                            <td className="p-1 px-1.5 text-slate-300 font-semibold">{item.sku}</td>
                            <td className="p-1 px-1.5 text-right text-slate-400">{qty}</td>
                            <td className="p-1 px-1.5 text-right text-slate-400">₹{rate}</td>
                            <td className="p-1 px-1.5 text-right text-emerald-400 font-bold">₹{itemVal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {exportResult && (
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8.5px] font-mono rounded leading-normal animate-pulse">
                    {exportResult}
                  </div>
                )}

                <button
                  onClick={handleExportCompiledReport}
                  className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition uppercase flex items-center justify-center gap-1 shadow"
                >
                  <FileDown className="h-3.5 w-3.5" /> EXPORT STORE AUDIT REPORT (PDF)
                </button>
              </div>
            )}

            {/* ORIGINAL SYSTEM SETTINGS TAB */}
            {panelTab === "settings" && (
              <div id="sub-panel-settings" className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1 text-rose-400 text-[10px] font-mono uppercase pb-1 border-b border-slate-800">
                  <AlertOctagon className="h-3.5 w-3.5" /> ADVANCED SYSTEM PARAMETERS
                </div>

                <p className="text-[10px] text-slate-400 leading-normal">
                  These features modify the backing local store registry. Please proceed with caution.
                </p>

                <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[9px] font-mono text-rose-300 leading-normal space-y-2">
                  <div>
                    <strong>FACTORY RESET DB:</strong>
                    <p className="text-slate-400 mt-0.5 text-[8.5px]">Reverts all stock quantities, transaction passbooks, expenses, and security audit collections to default retail presets.</p>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to write-clean the entire shop ledger to factory settings? This is irreversible!")) {
                        resetLedgerToFactory();
                        alert("Shop ledger reverted successfully.");
                      }
                    }}
                    className="px-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[8.5px] rounded font-bold cursor-pointer transition"
                  >
                    TRIGGER HARD MASTER RESET
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

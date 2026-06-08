import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { X, Plus, Sparkles, FolderPlus } from "lucide-react";

interface ProductRegistryModalProps {
  onClose: () => void;
}

export const ProductRegistryModal: React.FC<ProductRegistryModalProps> = ({ onClose }) => {
  const { items, addItem } = useInventory();

  // Registry form fields
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Face");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState(15);
  const [initialStock, setInitialStock] = useState(40);
  const [location, setLocation] = useState("ShelfA-Row1");
  const [costPrice, setCostPrice] = useState(100);
  const [sellPrice, setSellPrice] = useState(135);
  const [mrp, setMrp] = useState(150);
  const [feedback, setFeedback] = useState("");
  const [activeClerk, setActiveClerk] = useState("Staff Register Desk");

  const CATEGORIES = ["Face", "Eyes", "Hair", "Skin", "Nails", "Other"];

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku.trim() || !name.trim()) {
      setFeedback("Error: Please specify both SKU and Product Name!");
      return;
    }

    const uppercaseSku = sku.trim().toUpperCase();
    const isDuplicate = items.some((i) => i.sku.toUpperCase() === uppercaseSku);
    if (isDuplicate) {
      setFeedback(`Error: SKU '${uppercaseSku}' already exists in store catalog!`);
      return;
    }

    const finalCP = costPrice || 100;
    const finalSP = sellPrice || Math.round(finalCP * 1.35);
    const finalMRP = mrp || Math.round(finalCP * 1.5);

    // Initial stock needs batch allocation if > 0
    const initialBatch = initialStock > 0 ? [{
      id: `b-${Date.now()}-reg`,
      batchNumber: `B-REG-${uppercaseSku}`,
      mfgDate: new Date().toISOString().substring(0, 10),
      expiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().substring(0, 10), // +2 Years
      initialQty: initialStock,
      currentQty: initialStock
    }] : [];

    addItem({
      sku: uppercaseSku,
      name: name.trim(),
      category,
      description: description.trim() || `${category} beauty and retail cosmetics item.`,
      lowStockThreshold: threshold,
      initialStock,
      unit: "pcs",
      location: location.trim() || "General Cosmetics Shelf",
      costPrice: finalCP,
      sellPrice: finalSP,
      mrp: finalMRP,
      batches: initialBatch
    }, activeClerk);

    setFeedback(`✓ Product '${name.trim()}' Registered Successfully.`);
    
    // Clear fields
    setSku("");
    setName("");
    setDescription("");
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="product-registry-modal-panel"
        className="w-full max-w-sm bg-slate-900 border border-pink-500/30 rounded-2xl p-4 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-6 w-6 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <FolderPlus className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black font-mono tracking-wider text-pink-400 uppercase">
                ➕ New Product SKU
              </h3>
              <p className="text-[9px] text-slate-400">Add beauty SKU to store inventory catalog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer select-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {feedback && (
          <div className={`p-2 rounded text-[8.5px] font-mono leading-normal text-center ${feedback.startsWith("Error") ? 'bg-rose-500/10 border border-rose-500/20 text-rose-450' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse'}`}>
            {feedback}
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5 uppercase font-bold">BARCODE / SKU *</label>
              <input
                type="text"
                placeholder="LAK-ROSE-120"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 uppercase"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 uppercase font-bold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-250 font-sans"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[9px] font-mono">
            <label className="text-slate-500 block mb-0.5 uppercase font-bold">Product DISPLAY NAME *</label>
            <input
              type="text"
              placeholder="e.g. Lakme Matte Eyeliner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              required
            />
          </div>

          <div className="text-[9px] font-mono">
            <label className="text-slate-500 block mb-0.5 uppercase text-[8px]">Detailed Description (Optional)</label>
            <textarea
              placeholder="Enriched ingredients, waterproof, color shade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[8.5px] font-sans focus:outline-none"
            />
          </div>

          {/* Sizing Price Specs (CP, SP, MRP) */}
          <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5 uppercase font-bold">Cost (CP) *</label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-center font-bold text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 uppercase font-bold">Sell (SP) *</label>
              <input
                type="number"
                min="1"
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-center font-bold text-pink-400"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 uppercase font-bold">MRP (₹) *</label>
              <input
                type="number"
                min="1"
                value={mrp}
                onChange={(e) => setMrp(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-center text-amber-400 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5 uppercase">Shelf Location</label>
              <input
                type="text"
                placeholder="ShelfA-Row1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 uppercase text-[8px] font-bold">Low Alert Limit</label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-amber-400 text-center"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono pt-1">
            <div>
              <label className="text-slate-500 block mb-0.5 uppercase">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-emerald-450 text-center"
                required
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-0.5 uppercase">Operator initials</label>
              <input
                type="text"
                value={activeClerk}
                onChange={(e) => setActiveClerk(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded-lg cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-1 shadow-md pt-2"
          >
            <Sparkles className="h-3.5 w-3.5" /> Commit SKU creation to Catalog
          </button>
        </form>
      </div>
    </div>
  );
};

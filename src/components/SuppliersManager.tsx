/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Supplier } from "../types";
import { Plus, Trash, User, Phone, Mail, Award, MapPin } from "lucide-react";

export const SuppliersManager: React.FC = () => {
  const { suppliers, purchases, addSupplier, deleteSupplier } = useInventory();

  // Create Supplier Fields
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  
  const [feedback, setFeedback] = useState("");

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback("Error: Supplier Name is required.");
      return;
    }

    addSupplier({
      name: name.trim(),
      contactName: contactName.trim() || "Account Representative",
      phone: phone.trim() || "N/A",
      email: email.trim() || "info@supplier.com",
      gstin: gstin.trim().toUpperCase() || "UNREGISTERED",
      address: address.trim() || "N/A"
    }, "Manager Principal");

    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setGstin("");
    setAddress("");
    setFeedback("✓ Wholesaler registered successfully!");
    setTimeout(() => setFeedback(""), 3000);
  };

  // Helper to compute supplier stats
  const getSupplierProcurementStats = (supName: string) => {
    const matched = purchases.filter(p => p.supplierName.toUpperCase() === supName.toUpperCase());
    const count = matched.length;
    const value = matched.reduce((sum, p) => sum + p.grandTotal, 0);
    return { count, value };
  };

  return (
    <div className="space-y-4">
      {/* ADD SUPPLIER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-bold text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          🏢 Add New Wholesale Wholesaler
        </h4>

        <form onSubmit={handleSubmitSupplier} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">COMPANY NAME *</label>
              <input
                type="text"
                placeholder="Keshav Sales Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">CONTACT REPRESENTATIVE</label>
              <input
                type="text"
                placeholder="John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="98XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">BUSINESS EMAIL</label>
              <input
                type="email"
                placeholder="orders@sales.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div className="col-span-2">
              <label className="text-slate-500 block mb-0.5">WHOLESALER GSTIN (INDIAN 15-CHARS)</label>
              <input
                type="text"
                placeholder="27AAAAA1111A1Z1"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 uppercase"
              />
            </div>
          </div>

          <div className="text-[9px] font-mono">
            <label className="text-slate-500 block mb-0.5">OFFICE ADDRESS</label>
            <input
              type="text"
              placeholder="Commercial hub street, state, pin..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
            />
          </div>

          {feedback && (
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono leading-normal">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition uppercase"
          >
            Register Wholesaler Page
          </button>
        </form>
      </div>

      {/* SUPPLIER DIRECTORY LIST & STATS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">
          📋 Registered Supplier Directory & Analytics
        </span>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {suppliers.map((s) => {
            const stats = getSupplierProcurementStats(s.name);
            return (
              <div key={s.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-1.5 text-[8.5px] font-mono">
                <div className="flex justify-between items-start border-b border-slate-900/50 pb-1.5">
                  <div>
                    <h5 className="text-[10px] font-bold text-white font-sans flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-pink-500 shrink-0" /> {s.name}
                    </h5>
                    <span className="text-slate-500 text-[7px] font-mono block mt-0.5">GSTIN: <strong className="text-slate-400">{s.gstin}</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete wholesaler profile ${s.name}?`)) {
                        deleteSupplier(s.id, "Manager central panel");
                      }
                    }}
                    className="p-1 text-rose-450 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer"
                  >
                    <Trash className="h-2.5 w-2.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <User className="h-2.5 w-2.5 text-slate-600" /> Rep: {s.contactName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-slate-600" /> {s.phone}
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <Mail className="h-2.5 w-2.5 text-slate-600" /> {s.email}
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <MapPin className="h-2.5 w-2.5 text-slate-600" /> {s.address}
                  </div>
                </div>

                {/* PROCUREMENT ANALYTICS BOX */}
                <div className="mt-1 p-2 bg-slate-900 rounded border border-slate-850 flex justify-between items-center text-[7.5px] text-slate-400 font-mono text-center">
                  <div>
                    <span className="block text-slate-500">BILLS PROCURED</span>
                    <strong className="text-white text-[9.5px]">{stats.count} Bills</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-slate-500">TOTAL BUSINESS VOLUME</span>
                    <strong className="text-emerald-400 text-[9.5px]">₹{stats.value.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { useInventory } from "../context/InventoryContext";
import { FileUp, FileText, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { ParsedInvoice } from "../types";

export const InvoiceParser: React.FC = () => {
  const { triggerInvoiceImport } = useInventory();
  const [inputText, setInputText] = useState("");
  const [currentOperator, setCurrentOperator] = useState("Automatic Registry");
  const [parsedResult, setParsedResult] = useState<ParsedInvoice | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "success" | "failover" | "duplicate">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const HEALTHY_INVOICE_SAMPLE_1 = `
--------------------------------------------------
   SAGAR COSMETICS WHOLESALE IN-VOICE (DELHI)
--------------------------------------------------
Invoice No: INV-49210
Vendor: Sagar Cosmetics Wholesale
Date: 2026-06-07

LINE ITEMS:
--------------------------------------------------
Product: LAK-ROSE-100
Item Name: Lakme Rose Face Powder
Units: 25
Price per unit: 180 INR

--------------------------------------------------
Total Value: 4500 USD
Code: LAK-ROSE-100
Qty: 25
--------------------------------------------------
Status: Delivered to store.
  `;

  const HEALTHY_INVOICE_SAMPLE_2 = `
LAKME INDIA HUB RECEIPT
--------------------------------------
Invoice Num: LAK-9922
Seller: Lakme India Distributors
SKU: LAK-ROSE-100
Quantity: 15
Total Sum: 2700 INR
Date: 2026-06-07
  `;

  const BROKEN_INVOICE_SAMPLE = `
INCORRECT MEMO DOC
--------------------------------------
This document is missing SKU registers, amount, or vendor information. 
Price: free
No SKU matching cosmetics.
Quantity: Zero
  `;

  const handleTakePhoto = () => {
    const mockSnapText = `
========================================
       MAYBELLINE METRO DISTRIBUTORS
========================================
Invoice No: INV-MAY-998
Vendor: Maybelline Metro Distributors
Date: 2026-06-07

Product: MAY-KAJAL-200
SKU: MAY-KAJAL-200
Qty: 40
Total Value: 6400 INR
----------------------------------------
    Verified Store Scanner Active
`;
    setInputText(mockSnapText.trim());
    handleParse(mockSnapText.trim());
  };

  const handleFromGallery = () => {
    const mockGalleryText = `
========================================
       LOREAL INDIA LOGISTICS CENTRE
========================================
Invoice No: INV-LOR-223
Vendor: Loreal India Logistics
Date: 2026-06-07

Product: LOR-SHAMP-300
SKU: LOR-SHAMP-300
Qty: 18
Total Value: 4860 INR
----------------------------------------
    Gallery Upload Complete
`;
    setInputText(mockGalleryText.trim());
    handleParse(mockGalleryText.trim());
  };

  const handleParse = (text: string) => {
    const outcome = triggerInvoiceImport(text, currentOperator || "Worker System");
    
    setParsedResult(outcome.data);
    if (outcome.success) {
      if (outcome.isDuplicate) {
        setParseStatus("duplicate");
        alert("Invoice Already Imported!");
      } else {
        setParseStatus("success");
      }
    } else {
      setParseStatus("failover");
    }
  };

  const loadSample = (sampleText: string) => {
    setInputText(sampleText.trim());
    handleParse(sampleText.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      handleParse(content);
    };
    reader.readAsText(file);
  };

  return (
    <div id="invoice-parser-section" className="space-y-4">
      {/* Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 pb-2.5">
        <h3 className="text-xs font-bold font-mono text-pink-400 uppercase tracking-wider">
          Invoice Auto-Importer
        </h3>
        <p className="text-[10px] text-slate-400 leading-normal">
          Upload or scan supplier bills to update cosmetics inventory values instantly without physical data entry.
        </p>
      </div>

      {/* INPUT ZONE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <div>
          <label className="block text-[8px] text-slate-500 font-mono mb-0.5 uppercase">Receiver Worker initials *</label>
          <input
            type="text"
            placeholder="e.g. Arun (In-charge)"
            value={currentOperator}
            onChange={(e) => setCurrentOperator(e.target.value)}
            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Triple Source Click Actions for Touch Devices */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-pink-500/50 hover:bg-slate-900/40 transition cursor-pointer text-center"
          >
            <span className="text-[11px] font-bold text-pink-400 block mb-0.5">📄 PDF</span>
            <span className="text-[7px] text-slate-500 font-mono uppercase tracking-tight">Choose PDF</span>
          </button>
          
          <button
            type="button"
            onClick={handleTakePhoto}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-pink-500/50 hover:bg-slate-900/40 transition cursor-pointer text-center"
          >
            <span className="text-[11px] font-bold text-pink-400 block mb-0.5">📸 PHOTO</span>
            <span className="text-[7px] text-slate-500 font-mono uppercase tracking-tight">Take Photo</span>
          </button>
          
          <button
            type="button"
            onClick={handleFromGallery}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-pink-500/50 hover:bg-slate-900/40 transition cursor-pointer text-center"
          >
            <span className="text-[11px] font-bold text-pink-400 block mb-0.5">🖼️ GALLERY</span>
            <span className="text-[7px] text-slate-500 font-mono uppercase tracking-tight">From Gallery</span>
          </button>
        </div>

        {/* Hidden manual inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".txt,.pdf"
        />

        {/* Direct Text Input & Quick Injects */}
        <div>
          <div className="flex flex-col gap-1 mb-1.5">
            <label className="block text-[8px] text-slate-500 font-mono uppercase">Quick Demo Receipts</label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => loadSample(HEALTHY_INVOICE_SAMPLE_1)}
                className="px-1.5 py-0.5 bg-pink-950/50 hover:bg-pink-900 text-pink-300 border border-pink-800/40 rounded text-[8px] font-mono cursor-pointer transition active:scale-95"
              >
                Sagar Wholesaler Bill
              </button>
              <button
                type="button"
                onClick={() => loadSample(HEALTHY_INVOICE_SAMPLE_2)}
                className="px-1.5 py-0.5 bg-pink-950/50 hover:bg-pink-900 text-pink-300 border border-pink-800/40 rounded text-[8px] font-mono cursor-pointer transition active:scale-95"
              >
                Lakme India Hub Receipt
              </button>
              <button
                type="button"
                onClick={() => loadSample(BROKEN_INVOICE_SAMPLE)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700/60 rounded text-[8px] font-mono cursor-pointer transition active:scale-95"
              >
                Corrupt Bill Failover
              </button>
            </div>
          </div>
          <textarea
            id="invoice-raw-textarea"
            rows={4}
            placeholder="Paste bill text columns here..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (e.target.value.trim()) handleParse(e.target.value);
            }}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none placeholder-slate-700"
          />
        </div>
      </div>

      {/* OUTPUT ZONE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
          <span className="text-[9px] font-mono font-bold tracking-wide text-slate-400 uppercase">
            Auto Parsing Status
          </span>
          
          {parseStatus === "idle" && (
            <span className="text-[7px] px-1 py-0.2 bg-slate-950 text-slate-500 border border-slate-800 rounded font-mono uppercase">
              Standby
            </span>
          )}
          {parseStatus === "success" && (
            <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold animate-pulse">
              ✓ STORE STOCK APPLIED
            </span>
          )}
          {parseStatus === "duplicate" && (
            <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.2 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded font-mono font-bold animate-bounce">
              ⚠️ DUPLICATE DETECTED
            </span>
          )}
          {parseStatus === "failover" && (
            <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.2 bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded font-mono font-bold">
              ⚡ SAFE-FAILOVER ACTIVATED
            </span>
          )}
        </div>

        {parseStatus === "failover" && (
          <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-500 font-mono leading-normal">
            <strong>Warning:</strong> Bill details did not match correct formatting requirements. System automatically triggered safe state fallback parameters safely.
          </div>
        )}

        {parseStatus === "duplicate" && (
          <div id="duplicate-invoice-alert-banner" className="mb-2 p-2 bg-rose-950/60 border border-rose-500/40 rounded text-[9px] text-rose-300 font-mono leading-relaxed">
            <strong>Duplicate Bill Alert:</strong> A transaction matching this Bill No ({parsedResult?.invoiceNumber}) and Supplier ({parsedResult?.vendor}) is already recorded in the shop register. No dual balance stock was added.
          </div>
        )}

        {parseStatus === "success" && (
          <div className="mb-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-400 font-mono leading-normal">
            <strong>Success:</strong> Matching SKU {parsedResult?.itemCode} parsed automatically. Stock level updated successfully!
          </div>
        )}

        {/* DETAILS GRID */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="block text-[8px] text-slate-500 uppercase">Bill No</span>
            <span className={parsedResult?.invoiceNumber === "Not Detected" ? "text-rose-400" : "text-slate-200 font-bold"}>
              {parsedResult ? parsedResult.invoiceNumber : "N/A"}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="block text-[8px] text-slate-500 uppercase">Supplier</span>
            <span className={parsedResult?.vendor === "Not Detected" ? "text-rose-400" : "text-slate-200 font-bold"}>
              {parsedResult ? parsedResult.vendor : "N/A"}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="block text-[8px] text-slate-500 uppercase">Extracted SKU</span>
            <span className={parsedResult?.itemCode === "Not Detected" ? "text-rose-400" : "text-slate-200 font-bold"}>
              {parsedResult ? parsedResult.itemCode : "N/A"}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <span className="block text-[8px] text-slate-500 uppercase">Bill Quantity</span>
            <span className={parsedResult?.quantity === "Not Detected" ? "text-rose-400" : "text-slate-200 font-bold"}>
              {parsedResult ? parsedResult.quantity : "N/A"}
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800 col-span-2">
            <span className="block text-[8px] text-slate-500 uppercase">Transaction Financial Value</span>
            <span className={parsedResult?.totalValue === "Not Detected" ? "text-rose-400" : "text-emerald-400 font-bold text-xs"}>
              {parsedResult
                ? parsedResult.totalValue === "Not Detected"
                  ? "Not Detected"
                  : `₹ ${parsedResult.totalValue.toLocaleString()}`
                : "N/A"}
            </span>
          </div>
        </div>

        <div className="mt-3.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[8px] text-slate-500 font-mono">
          <span>Safe Parser V1.5</span>
          <span>Sidivniyak Beauty Store</span>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { Sale, SaleItem } from "../types";
import { Plus, Trash, Printer, AlertTriangle, Check, X, Download, Share2, Send, Mail } from "lucide-react";
import { jsPDF } from "jspdf";

export const SalesManager: React.FC = () => {
  const { items, sales, addSale, cancelSale, calculateStock } = useInventory();

  // Create Sale form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [isInterState, setIsInterState] = useState(false); // Intra: CGST+SGST, Inter: IGST
  const [discount, setDiscount] = useState(0);
  
  const [saleItems, setSaleItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: "", quantity: 1 }
  ]);

  const [feedback, setFeedback] = useState("");
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  // PDF Document Generation Helper
  const generatePdf = (bill: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Header pink border line
    doc.setFillColor(219, 39, 119); // pink-600
    doc.rect(0, 0, 210, 8, "F");

    // Corporate Identity / Store Brand
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(219, 39, 119);
    doc.text("SIDIVNIYAK BEAUTY & COSMETICS", 15, 25);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Cosmetics Retail Outlet, Mumbai, MH | GSTIN: 27SIDIV9802F1Z4", 15, 31);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 36, 195, 36);

    // Invoice Meta / Entity Information
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text("RETAIL MEMO TO:", 15, 47);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Customer Name : ${bill.customerName}`, 15, 53);
    if (bill.customerPhone) {
      doc.text(`Mobile Number : ${bill.customerPhone}`, 15, 59);
    }
    if (bill.customerGstin) {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(219, 39, 119);
      doc.text(`Buyer GSTIN   : ${bill.customerGstin}`, 15, 65);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("TRANSACTION METRICS:", 130, 47);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice No : #${bill.invoiceNumber}`, 130, 53);
    doc.text(`Sale Date  : ${bill.saleDate}`, 130, 59);
    doc.text(`Status     : ${bill.isCancelled ? "VOID/CANCELLED" : "SETTLED (CASH)"}`, 130, 65);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 75, 180, 9, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text("ITEM PARTICULARS / SKU", 18, 81);
    doc.text("QTY", 125, 81);
    doc.text("RATE (INR)", 150, 81);
    doc.text("TOTAL (INR)", 175, 81);

    // Table Rows
    let y = 91;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);

    bill.items.forEach((item: any, idx: number) => {
      // Alternate light pink shading for sleek zebra rows
      if (idx % 2 === 1) {
        doc.setFillColor(253, 244, 245);
        doc.rect(15, y - 5, 180, 8, "F");
      }
      doc.text(`${item.name} (${item.sku})`, 18, y);
      doc.text(`${item.quantity} PCS`, 125, y);
      doc.text(`Rs.${parseFloat(item.rate).toFixed(2)}`, 150, y);
      doc.text(`Rs.${parseFloat(item.total).toFixed(2)}`, 175, y);
      y += 8;
    });

    // Summary calculation panel
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal Exclusive:", 115, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs.${parseFloat(bill.subtotal).toFixed(2)}`, 175, y);

    y += 6;
    doc.setTextColor(100, 116, 139);
    doc.text("CGST Accrual (9%):", 115, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs.${parseFloat(bill.cgstTotal).toFixed(2)}`, 175, y);

    y += 6;
    doc.setTextColor(100, 116, 139);
    doc.text("SGST Accrual (9%):", 115, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs.${parseFloat(bill.sgstTotal).toFixed(2)}`, 175, y);

    if (bill.discount > 0) {
      y += 6;
      doc.setTextColor(239, 68, 68);
      doc.text("Store Discounts Given:", 115, y);
      doc.text(`-Rs.${parseFloat(bill.discount).toFixed(2)}`, 175, y);
    }

    y += 8;
    doc.setFillColor(252, 231, 243); // Tailwind pink-100 shade
    doc.rect(110, y - 5.5, 85, 9, "F");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(219, 39, 119); // Pink-600
    doc.text("GRAND PAYABLE VALUE:", 115, Number(y.toFixed(0)));
    doc.text(`Rs.${parseFloat(bill.grandTotal).toFixed(2)}`, 175, Number(y.toFixed(0)));

    // Store disclaimer footer
    y += 28;
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for shopping with us! This invoice is digitally managed in Sidivniyak Outward Ledger.", 15, y);

    return doc;
  };

  const downloadPdf = (bill: any) => {
    try {
      const doc = generatePdf(bill);
      doc.save(`Invoice_${bill.invoiceNumber}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert(`Unable to download PDF: ${err.message || err}`);
    }
  };

  const sharePdf = async (bill: any) => {
    try {
      const doc = generatePdf(bill);
      const blob = doc.output("blob");
      const file = new File([blob], `Invoice_${bill.invoiceNumber}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Sidivniyak Memo #${bill.invoiceNumber}`,
          text: `Retail Invoice #${bill.invoiceNumber} details for ${bill.customerName}.`
        });
      } else {
        alert("Web Share API is not supported in this browser context. Downloading the PDF file directly.");
        doc.save(`Invoice_${bill.invoiceNumber}.pdf`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Unable to share PDF: ${err.message || err}`);
    }
  };

  const whatsappShare = (bill: any) => {
    const textMsg = `*SIDIVNIYAK BEAUTY & COSMETICS*
*RETAIL BILL MEMO:* #${bill.invoiceNumber}
*Date:* ${bill.saleDate}
*Customer:* ${bill.customerName}
----------------------------------
*Items Ordered:*
${bill.items.map((it: any) => `- ${it.name} [Qty: ${it.quantity} @ ₹${it.rate}] = ₹${it.total}`).join("\n")}
----------------------------------
*Subtotal (Excl):* ₹${bill.subtotal}
*CGST/SGST (18%):* ₹${Number(bill.cgstTotal + bill.sgstTotal).toFixed(2)}
*Discounts:* -₹${bill.discount}
*GRAND PAYABLE:* ₹${bill.grandTotal}

_Thank you for your valuable patronage!_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;
    window.open(url, "_blank");
  };

  const emailShare = (bill: any) => {
    const subject = `Invoice ${bill.invoiceNumber} from Sidivniyak Beauty & Cosmetics`;
    const emailBody = `SIDIVNIYAK BEAUTY & COSMETICS
Mumbai, MH Region

CASH MEMO INVOICE REF: #${bill.invoiceNumber}
Date of Transaction: ${bill.saleDate}
Purchased By: ${bill.customerName}
${bill.customerPhone ? 'Phone Contact: ' + bill.customerPhone : ''}

TRANSACTION BILLING SLIP:
==================================
${bill.items.map((it: any) => `${it.name} | Qty: ${it.quantity} | Rate: ₹${it.rate} | Total: ₹${it.total}`).join("\n")}
==================================
Subtotal Exclusive: ₹${bill.subtotal}
Central GST (9%): ₹${bill.cgstTotal}
State GST (9%): ₹${bill.sgstTotal}
Discounts Applied: -₹${bill.discount}
GRAND TOTAL REVENUE PAYABLE: ₹${bill.grandTotal}

Thank you for shopping with us! Please find this record on your customer ledger.`;

    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, "_blank");
  };

  const printInvoice = (bill: any) => {
    try {
      const iframeId = "print-invoice-iframe-render-manager";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (iframe) iframe.remove();

      iframe = document.createElement("iframe") as HTMLIFrameElement;
      iframe.id = iframeId;
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) return;

      const htmlContent = `
        <html>
          <head>
            <title>Invoice #${bill.invoiceNumber}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                color: #000;
                background: #fff;
                padding: 15px;
                font-size: 11px;
                line-height: 1.35;
              }
              .header {
                text-align: center;
                border-bottom: 2px dashed #000;
                padding-bottom: 12px;
                margin-bottom: 12px;
              }
              .title {
                font-size: 15px;
                font-weight: bold;
                margin: 0;
                letter-spacing: 0.5px;
              }
              .subtitle {
                font-size: 9px;
                margin: 3px 0 0 0;
                text-transform: uppercase;
              }
              .details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 10px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
              }
              th, td {
                padding: 4px 0;
                text-align: left;
                font-size: 10px;
              }
              th {
                border-bottom: 1px solid #000;
                font-weight: bold;
              }
              .nowrap { whitespace: nowrap; }
              .text-right { text-align: right; }
              .summary {
                border-top: 1px dashed #000;
                padding-top: 8px;
                text-align: right;
                font-size: 10px;
                margin-top: 8px;
              }
              .summary div {
                margin-bottom: 2.5px;
              }
              .grand {
                font-size: 13px;
                font-weight: bold;
                border-top: 1px solid #000;
                padding-top: 4px;
                margin-top: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 25px;
                font-size: 9px;
                border-top: 1px dashed #000;
                padding-top: 8px;
              }
              @media print {
                body { padding: 0; margin: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">SIDIVNIYAK BEAUTY & COSMETICS</div>
              <div class="subtitle">Cosmetics Retail Outlet, Mumbai, MH</div>
              <div class="subtitle">GSTIN: 27SIDIV9802F1Z4 | Cash billingmemo</div>
            </div>
            
            <div class="details">
              <div>
                <strong>CUSTOMER:</strong> ${bill.customerName}<br>
                ${bill.customerPhone ? 'PH: ' + bill.customerPhone + '<br>' : ''}
                ${bill.customerGstin ? 'GSTIN: ' + bill.customerGstin + '<br>' : ''}
              </div>
              <div class="text-right">
                <strong>INVOICE:</strong> #${bill.invoiceNumber}<br>
                <strong>DATE:</strong> ${bill.saleDate}
              </div>
            </div>

            ${bill.isCancelled ? `
              <div style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; margin-bottom: 12px;">
                THIS TRANSACTION WAS CANCELLED / REVERSED
              </div>
            ` : ''}

            <table>
              <thead>
                <tr>
                  <th>ITEM DETAILS</th>
                  <th class="text-right">QTY</th>
                  <th class="text-right">RATE</th>
                  <th class="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${bill.items.map((item: any) => `
                  <tr>
                    <td>${item.name}<br><small style="color:#666">SKU: ${item.sku}</small></td>
                    <td class="text-right">${item.quantity} PCS</td>
                    <td class="text-right">₹${parseFloat(item.rate).toFixed(2)}</td>
                    <td class="text-right">₹${parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div>SUBTOTAL EXCLUSIVE: ₹${parseFloat(bill.subtotal).toFixed(2)}</div>
              <div>CGST TAX ACCRUAL (9%): ₹${parseFloat(bill.cgstTotal).toFixed(2)}</div>
              <div>SGST TAX ACCRUAL (9%): ₹${parseFloat(bill.sgstTotal).toFixed(2)}</div>
              ${bill.discount > 0 ? `<div style="color:red">CASH DISCOUNTS: -₹${parseFloat(bill.discount).toFixed(2)}</div>` : ''}
              <div class="grand text-right">GRAND REVENUE PAYABLE: ₹${parseFloat(bill.grandTotal).toFixed(2)}</div>
            </div>

            <div class="footer">
              Thank you for shopping with us!<br>
              Cash Memo Generated Offline via Sidivniyak Outward Ledger.
            </div>

            <script>
              window.onload = function() {
                window.focus();
                window.print();
              }
            </script>
          </body>
        </html>
      `;

      doc.open();
      doc.write(htmlContent);
      doc.close();
    } catch (err: any) {
      console.error(err);
      alert(`Print execution failed: ${err.message || err}`);
    }
  };

  // Computed values for current draft
  const draftSubtotal = saleItems.reduce((sum, si) => {
    const item = items.find((i) => i.id === si.itemId);
    if (!item) return sum;
    // Assume sale price is costPrice * 1.35 (markup of 35% as a smart default cosmetics retail margin!)
    const price = Math.round((item.costPrice || 100) * 1.35);
    return sum + (price * si.quantity);
  }, 0);

  const draftGstRate = 18; // 18% India cosmetic rate
  const draftGstTotal = draftSubtotal * (draftGstRate / 100);
  const draftGrandTotal = Math.round(draftSubtotal + draftGstTotal - discount);

  const handleAddItemRow = () => {
    setSaleItems([...saleItems, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, itemId: string) => {
    const updated = [...saleItems];
    updated[idx].itemId = itemId;
    setSaleItems(updated);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const updated = [...saleItems];
    updated[idx].quantity = Math.max(1, qty);
    setSaleItems(updated);
  };

  const handleCreateSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filteredItems = saleItems.filter(si => si.itemId !== "");
    if (filteredItems.length === 0) {
      setFeedback("Error: Please select at least one item.");
      return;
    }

    // Check stock availability
    for (const draftItem of filteredItems) {
      const currentStock = calculateStock(draftItem.itemId);
      const itemObj = items.find(i => i.id === draftItem.itemId);
      if (currentStock < draftItem.quantity) {
        setFeedback(`Insufficient Stock: Only ${currentStock} ${itemObj?.unit} left for ${itemObj?.name}`);
        return;
      }
    }

    // Build sale items array
    const cleanItems: SaleItem[] = filteredItems.map((si, idx) => {
      const item = items.find(i => i.id === si.itemId)!;
      const rate = Math.round((item.costPrice || 100) * 1.35);
      const sub = rate * si.quantity;
      const gstAmt = sub * (draftGstRate / 100);
      
      return {
        id: `si-${Date.now()}-${idx}`,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        quantity: si.quantity,
        rate,
        gstPercent: draftGstRate,
        cgst: isInterState ? 0 : Math.round(gstAmt / 2),
        sgst: isInterState ? 0 : Math.round(gstAmt / 2),
        total: Math.round(sub + gstAmt)
      };
    });

    const finalSubtotal = cleanItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    const finalGst = Math.round(finalSubtotal * (draftGstRate / 100));
    const finalCgst = isInterState ? 0 : Math.round(finalGst / 2);
    const finalSgst = isInterState ? 0 : Math.round(finalGst / 2);
    const finalIgst = isInterState ? finalGst : 0;

    const invoiceNum = `SDV-SL-${Date.now().toString().substring(6)}`;

    const registeredId = addSale({
      invoiceNumber: invoiceNum,
      customerName: customerName || "Counter Walk-In Cash",
      customerPhone,
      customerGstin,
      saleDate: new Date().toISOString().substring(0, 10),
      items: cleanItems,
      subtotal: finalSubtotal,
      cgstTotal: finalCgst,
      sgstTotal: finalSgst,
      igstTotal: finalIgst,
      totalGst: finalGst,
      discount,
      grandTotal: Math.round(finalSubtotal + finalGst - discount),
      isCancelled: false,
      operator: "Manager Billing Console"
    }, "Manager Principal");

    const printedSale = sales.find(s => s.invoiceNumber === invoiceNum) || {
      id: registeredId,
      invoiceNumber: invoiceNum,
      customerName: customerName || "Counter Walk-In Cash",
      customerPhone,
      customerGstin,
      saleDate: new Date().toISOString().substring(0, 10),
      items: cleanItems,
      subtotal: finalSubtotal,
      cgstTotal: finalCgst,
      sgstTotal: finalSgst,
      igstTotal: finalIgst,
      totalGst: finalGst,
      discount,
      grandTotal: Math.round(finalSubtotal + finalGst - discount),
      isCancelled: false,
      operator: "Manager Billing Console"
    };

    setActiveInvoice(printedSale as Sale);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setDiscount(0);
    setSaleItems([{ itemId: "", quantity: 1 }]);
    setFeedback("✓ Sale Invoice Recorded Successfully!");
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-4">
      {/* SALES CREATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-bold text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          💼 Indian GST Billing Terminal
        </h4>

        <form onSubmit={handleCreateSaleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">CUSTOMER NAME</label>
              <input
                type="text"
                placeholder="Walk-In General"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">PHONE NUMBER</label>
              <input
                type="text"
                placeholder="10-digit number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div>
              <label className="text-slate-500 block mb-0.5">CUSTOMER GSTIN</label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z1"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-slate-500 block mb-1">TAX GEOGRAPHY</label>
              <div className="flex items-center gap-2 h-7 bg-slate-950 px-2 rounded border border-slate-850">
                <input
                  type="checkbox"
                  id="geoCheck"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="accent-pink-500 cursor-pointer"
                />
                <label htmlFor="geoCheck" className="text-[8.5px] text-slate-300 font-bold cursor-pointer select-none">
                  INTER-STATE (IGST 18%)
                </label>
              </div>
            </div>
          </div>

          {/* DRAFT ITEMS SELECTOR */}
          <div className="space-y-2 pt-1">
            <span className="text-[8px] font-mono text-slate-400 block font-bold uppercase tracking-wider">
              BILL ITEMS LIST:
            </span>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {saleItems.map((si, idx) => {
                const stock = si.itemId ? calculateStock(si.itemId) : 0;
                return (
                  <div key={idx} className="flex gap-2 items-center bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="flex-1 min-w-0">
                      <select
                        value={si.itemId}
                        onChange={(e) => handleItemChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[9.5px] font-sans text-slate-200"
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.sku}) - Stock: {calculateStock(i.id)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-16 shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={si.quantity}
                        onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-[9px] text-pink-300"
                        required
                      />
                    </div>

                    {saleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 hover:text-white text-rose-450 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer shrink-0"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-[8px] font-mono text-slate-300 transition flex items-center gap-1 select-none cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-pink-500" /> [ADD ANOTHER LINE ITEM]
            </button>
          </div>

          {/* VALUE PRICING MATH SHIELD */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-[9px] font-mono space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>ITEMS SUB-TOTAL:</span>
              <span>₹{draftSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST INCLUDED (18% Cosmetics):</span>
              <span>₹{draftGstTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>DISCOUNT / REBATE (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-slate-900 border border-slate-800 rounded px-1 text-right text-[8.5px] text-slate-300 font-mono"
              />
            </div>
            <div className="flex justify-between text-pink-400 font-bold border-t border-slate-900 pt-1 text-[10px]">
              <span>NET PAYABLE BILL VALUE:</span>
              <span>₹{draftGrandTotal.toLocaleString()}</span>
            </div>
          </div>

          {feedback && (
            <div className={`p-1.5 rounded text-[9px] font-mono leading-normal ${feedback.startsWith("Error") || feedback.startsWith("Insufficient") ? "bg-rose-500/15 border border-rose-500/20 text-rose-400" : "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"}`}>
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-bold rounded cursor-pointer transition shadow-xl uppercase"
          >
            Generate Sale Invoice
          </button>
        </form>
      </div>

      {/* RENDER ACTIVE PRINTING INVOICE CARD */}
      {activeInvoice && (
        <div id="gst-invoice-printer-preview" className="bg-white border border-slate-300 rounded-xl p-3.5 text-slate-950 font-sans shadow-2xl relative overflow-hidden space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <p className="text-[14px] font-black tracking-wider text-pink-600 uppercase font-mono">SIDIVNIYAK BEAUTY</p>
              <p className="text-[8px] text-slate-500 font-mono uppercase tracking-tight leading-none">Cosmetics Retail, Mumbai, MH</p>
            </div>
            <div className="text-right">
              <span className="text-[7.5px] px-1 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-700 uppercase tracking-widest leading-none">TAX INVOICE</span>
              <p className="text-[9px] font-mono text-slate-600 mt-1 leading-none">{activeInvoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 text-[8.5px] font-mono text-slate-600 border-b border-slate-100 pb-2 gap-y-1">
            <div>
              <span className="text-slate-400 uppercase block text-[7px]">CUSTOMER DETAILS</span>
              <strong>{activeInvoice.customerName}</strong>
              {activeInvoice.customerPhone && <p className="leading-none mt-0.5">Ph: {activeInvoice.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase block text-[7px]">DATE OF SALE</span>
              <p className="font-bold">{activeInvoice.saleDate}</p>
              {activeInvoice.customerGstin && <p className="text-[7.5px] text-pink-600 font-bold leading-none mt-0.5">GSTIN: {activeInvoice.customerGstin}</p>}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded border border-slate-100">
            <table className="w-full text-left text-[8px] font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <th className="p-1 px-1.5 font-bold">ITEM NAME</th>
                  <th className="p-1 px-1.5 text-right font-bold">QTY</th>
                  <th className="p-1 px-1.5 text-right font-bold">RATE</th>
                  <th className="p-1 px-1.5 text-right font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoice.items.map((item, id) => (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-1 px-1.5 font-sans font-semibold text-slate-800">{item.name}</td>
                    <td className="p-1 px-1.5 text-right text-slate-500 font-semibold">{item.quantity}</td>
                    <td className="p-1 px-1.5 text-right text-slate-500">₹{item.rate}</td>
                    <td className="p-1 px-1.5 text-right font-bold text-slate-800">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-2 rounded text-[8.5px] font-mono space-y-0.5 border border-slate-100 text-slate-700 text-right">
            <div>SUBTOTAL VALUE: <span className="text-slate-900 font-bold">₹{activeInvoice.subtotal}</span></div>
            {activeInvoice.cgstTotal > 0 && (
              <>
                <div>CGST TAX ACCRUAL (9%): <span className="text-slate-900">₹{activeInvoice.cgstTotal}</span></div>
                <div>SGST TAX ACCRUAL (9%): <span className="text-slate-900 font-bold">₹{activeInvoice.sgstTotal}</span></div>
              </>
            )}
            {activeInvoice.igstTotal > 0 && (
              <div>IGST TAX ACCRUAL (18%): <span className="text-slate-900 font-bold">₹{activeInvoice.igstTotal}</span></div>
            )}
            {activeInvoice.discount > 0 && <div className="text-rose-500 font-bold">DISCOUNT/REBATE APPLIED: -₹{activeInvoice.discount}</div>}
            <div className="text-[10px] text-pink-600 font-black border-t border-slate-200 pt-1 uppercase">GRAND NET PAYABLE: ₹{activeInvoice.grandTotal}</div>
          </div>

          {/* Export & Share Panel */}
          <div className="border-t border-b border-slate-100 py-2 space-y-2">
            <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider font-mono">EXPORT & SHARE OPTIONS</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => downloadPdf(activeInvoice)}
                className="py-1 px-2 mb-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Download className="h-2.5 w-2.5 text-pink-600 font-bold" /> DOWNLOAD PDF
              </button>
              <button
                type="button"
                onClick={() => sharePdf(activeInvoice)}
                className="py-1 px-2 mb-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Share2 className="h-2.5 w-2.5 text-pink-600 font-bold" /> SHARE PDF FILE
              </button>
              <button
                type="button"
                onClick={() => whatsappShare(activeInvoice)}
                className="py-1 px-2 mb-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Send className="h-2.5 w-2.5 text-emerald-600 font-bold" /> WHATSAPP SHARE
              </button>
              <button
                type="button"
                onClick={() => emailShare(activeInvoice)}
                className="py-1 px-2 mb-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Mail className="h-2.5 w-2.5 text-sky-600 font-bold" /> EMAIL INVOICE
              </button>
            </div>
          </div>

          <div className="flex gap-2 text-[9px]">
            <button
              onClick={() => printInvoice(activeInvoice)}
              className="flex-1 py-1 bg-slate-950 hover:bg-slate-850 text-white font-mono font-bold rounded cursor-pointer flex items-center justify-center gap-1 shadow select-none"
            >
              <Printer className="h-3 w-3" /> PRINT BILL INVOICE
            </button>
            <button
              onClick={() => setActiveInvoice(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-mono font-semibold rounded cursor-pointer transition"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}

      {/* SALES HISTORY WITH DAILY/MONTHLY FILTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">
          📈 IN-STORE DECLARED INVOICE HISTORY
        </span>

        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {sales.length === 0 ? (
            <span className="block text-slate-500 text-[8.5px] font-mono py-2 text-center">
              No sales invoices logged in session index.
            </span>
          ) : (
            sales.slice().reverse().map((s) => (
              <div key={s.id} className={`p-2 bg-slate-950 border rounded flex flex-col gap-1 text-[8.5px] font-mono ${s.isCancelled ? 'border-dashed border-rose-500/40 opacity-60' : 'border-slate-850'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-200">{s.invoiceNumber}</strong>
                      {s.isCancelled && <span className="text-[7px] text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded font-bold uppercase shrink-0">CANCELLED</span>}
                    </div>
                    <span className="text-slate-500 block text-[7.5px]">{s.saleDate} • Custom: {s.customerName}</span>
                  </div>
                  <span className="text-pink-300 font-black shrink-0">₹{s.grandTotal}</span>
                </div>

                <div className="flex justify-between items-center text-[7.5px] border-t border-slate-900 pt-1 mt-0.5">
                  <span className="text-slate-500">Items Count: <strong className="text-slate-400">{s.items.length}</strong></span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveInvoice(s)} 
                      className="text-pink-400 hover:text-pink-200 cursor-pointer font-bold uppercase transition"
                    >
                      [VIEW/PRINT]
                    </button>
                    {!s.isCancelled && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Cancel Sale invoice ${s.invoiceNumber}? This will reverse the stock deduction.`)) {
                            cancelSale(s.id, "Manager billing user");
                          }
                        }} 
                        className="text-rose-400 hover:text-rose-300 cursor-pointer font-bold uppercase transition"
                      >
                        [CANCEL]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { Plus, Trash, Check, Loader2, Printer, Camera, QrCode, Search, Smartphone, Download, Share2, Send, Mail } from "lucide-react";
import { SaleItem } from "../types";
import { jsPDF } from "jspdf";

export const PosTerminal: React.FC = () => {
  const { items, addSale, isManagerMode, calculateStock } = useInventory();

  // POS State
  const [customerName, setCustomerName] = useState("Walking Customer");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().substring(0, 10));
  const [clerk, setClerk] = useState("Staff Register POS");
  const [discount, setDiscount] = useState(0);

  // Draft POS item rows
  const [saleItems, setSaleItems] = useState<{
    itemId: string;
    quantity: number;
    rate: number; // Selling price (SP)
  }[]>([
    { itemId: "", quantity: 1, rate: 100 }
  ]);

  const [feedback, setFeedback] = useState("");
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  // Scanning simulation states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanSpeed, setScanSpeed] = useState("");

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
      const iframeId = "print-invoice-iframe-render-pos";
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

  const handleAddItemRow = () => {
    setSaleItems([...saleItems, { itemId: "", quantity: 1, rate: 100 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: string, value: any) => {
    const updated = [...saleItems];
    
    if (field === "itemId" && value) {
      const parentProduct = items.find((i) => i.id === value);
      if (parentProduct) {
        // Pre-fill SP
        updated[idx] = {
          ...updated[idx],
          itemId: value,
          rate: parentProduct.sellPrice || Math.round((parentProduct.costPrice || 100) * 1.35)
        };
        setSaleItems(updated);
        return;
      }
    }

    updated[idx] = { ...updated[idx], [field]: value };
    setSaleItems(updated);
  };

  // Draft computations
  const draftSubtotal = saleItems.reduce((sum, item) => {
    if (!item.itemId) return sum;
    return sum + item.quantity * item.rate;
  }, 0);

  // India CGST + SGST calculations (typically, Cosmetics are 18% standard rate: CGST 9%, SGST 9%)
  const draftGstTotal = Math.round(draftSubtotal * 0.18);
  const draftGrandTotal = Math.max(0, draftSubtotal + draftGstTotal - discount);

  // Barcode scan simulation selection
  const handleTriggerSimulatedScan = (productSku: string) => {
    const matched = items.find((i) => i.sku.toUpperCase() === productSku.toUpperCase());
    if (matched) {
      // Find empty slot or add new row
      const updated = [...saleItems];
      const emptyRowIdx = updated.findIndex((r) => r.itemId === "");
      const matchPrice = matched.sellPrice || Math.round((matched.costPrice || 100) * 1.35);

      if (emptyRowIdx !== -1) {
        updated[emptyRowIdx] = { itemId: matched.id, quantity: 1, rate: matchPrice };
        setSaleItems(updated);
      } else {
        setSaleItems([...saleItems, { itemId: matched.id, quantity: 1, rate: matchPrice }]);
      }
      
      setScanSpeed(`✓ Scanned: '${matched.name}' Added successfully.`);
      setTimeout(() => setScanSpeed(""), 2000);
      setIsScannerOpen(false);
    } else {
      setScanSpeed("Error: Product Barcode not registered!");
    }
  };

  const handleCreateSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filtered = saleItems.filter((si) => si.itemId !== "");
    if (filtered.length === 0) {
      setFeedback("Error: Please select at least one registered item.");
      return;
    }

    // 1. Verify stocks before committing billing
    for (const item of filtered) {
      const stockAvailable = calculateStock(item.itemId);
      const parentObj = items.find((i) => i.id === item.itemId)!;
      if (stockAvailable < item.quantity) {
        setFeedback(`Insufficient Stock: SKU '${parentObj.sku}' only has ${stockAvailable} PCS in shop.`);
        return;
      }
    }

    // 2. Build final sale payload
    const processedItems: SaleItem[] = filtered.map((si, id) => {
      const parent = items.find((i) => i.id === si.itemId)!;
      const amountRaw = si.quantity * si.rate;
      
      // Determine CGST + SGST (9% each for 18% cumulative standard)
      const cgstAmt = Math.round(amountRaw * 0.09);
      const sgstAmt = Math.round(amountRaw * 0.09);

      return {
        id: `si-${Date.now()}-${id}`,
        itemId: si.itemId,
        sku: parent.sku,
        name: parent.name,
        quantity: si.quantity,
        rate: si.rate,
        gstPercent: 18,
        cgst: cgstAmt,
        sgst: sgstAmt,
        total: amountRaw + cgstAmt + sgstAmt
      };
    });

    const subtotal = processedItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalGst = Math.round(subtotal * 0.18);
    const finalBill = subtotal + totalGst - discount;

    const finalInvoiceNumber = `INV-${Date.now().toString().substring(7)}`;

    const newSale = {
      invoiceNumber: finalInvoiceNumber,
      customerName: customerName.trim() || "Walking Customer",
      customerGstin: customerGstin.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      saleDate,
      items: processedItems,
      subtotal,
      cgstTotal: Math.round(totalGst / 2),
      sgstTotal: Math.round(totalGst / 2),
      igstTotal: 0,
      totalGst,
      discount,
      grandTotal: Math.max(0, finalBill),
      isCancelled: false,
      operator: clerk
    };

    addSale(newSale, clerk);

    setFeedback("✓ Sale Invoice Recorded (Inward tax draft closed). Ledger rows successfully decremented.");
    setActiveInvoice(newSale);

    // Form resets
    setCustomerName("Walking Customer");
    setCustomerGstin("");
    setCustomerPhone("");
    setSaleItems([{ itemId: "", quantity: 1, rate: 100 }]);
    setDiscount(0);
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-4 font-mono text-[9px]">
      {/* SCANNING OPTIONS DRAWER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex justify-between items-center pb-1 border-b border-slate-800">
          <span className="text-pink-400 font-bold tracking-wider text-[9px] uppercase flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" /> Barcode & QR Code Desk Scanners
          </span>
          <button
            onClick={() => setIsScannerOpen(!isScannerOpen)}
            className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded text-[8px] cursor-pointer"
          >
            {isScannerOpen ? "[CLOSE SCANNER]" : "[OPEN VIRTUAL SCANNER]"}
          </button>
        </div>

        {isScannerOpen && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2 relative">
            <div className="h-16 border-2 border-dashed border-pink-500/30 rounded flex items-center justify-center relative overflow-hidden">
              <span className="absolute h-0.5 w-[90%] bg-rose-500/60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-rose-500 shadow-md animate-bounce" />
              <span className="text-[8px] text-slate-500 absolute bottom-1">LASER POSITION FINDER: ACTIVE</span>
              <Smartphone className="h-6 w-6 text-slate-700 animate-pulse" />
            </div>

            {scanSpeed && (
              <div className="p-1 px-2 bg-emerald-500/10 text-emerald-400 text-[8px] rounded border border-emerald-550/20 text-center animate-pulse">
                {scanSpeed}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[7.5px]">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => handleTriggerSimulatedScan(it.sku)}
                  className="bg-slate-905 border border-slate-800 hover:border-pink-500/50 p-1.5 text-left text-slate-300 truncate rounded flex items-center gap-1 cursor-pointer select-none"
                >
                  <QrCode className="h-3 w-3 shrink-0 text-pink-500/70" />
                  <span>Scan {it.sku}</span>
                </button>
              ))}
            </div>
            
            <div className="text-center pt-1">
              <label className="text-slate-600 font-sans text-[7.5px] block">Or hardware simulate scanning: drag-and-drop code image</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={() => {
                  if (items.length > 0) {
                    // simulate scanning random item
                    const randomItem = items[Math.floor(Math.random() * items.length)];
                    handleTriggerSimulatedScan(randomItem.sku);
                  }
                }}
                className="text-[7px] text-slate-500 mt-1 max-w-[150px] mx-auto file:bg-slate-900 file:border-0 file:text-[7.5px] file:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* POS BILL FORM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <h4 className="text-xs font-black text-pink-400 font-mono tracking-wider uppercase pb-1 border-b border-slate-800">
          🛍️ Indian GST Retail Billing Terminal
        </h4>

        <form onSubmit={handleCreateSaleSubmit} className="space-y-3.5">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-2">
            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">Customer Receipt Info</span>
            
            <div className="grid grid-cols-2 gap-2 text-[8.5px]">
              <div>
                <label className="text-slate-500 block mb-0.5">CUSTOMER DISPLAY NAME</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-100 font-sans text-[9px]"
                  placeholder="Walking Customer"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">CUSTOMER PHONE</label>
                <input
                  type="text"
                  placeholder="91xxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-905 border border-slate-800 rounded px-2 py-0.5 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[8.5px] pt-1">
              <div>
                <label className="text-slate-400 block mb-0.5">CUSTOMER GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="27AAAAA1111A1Z1"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="text-slate-550 block mb-0.5">CLERK INITIALS</label>
                <input
                  type="text"
                  value={clerk}
                  onChange={(e) => setClerk(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-150"
                  required
                />
              </div>
            </div>
          </div>

          {/* POS Bill Items Table rows */}
          <div className="space-y-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Invoiced Cart Lines
            </span>

            <div className="space-y-2 pr-1">
              {saleItems.map((si, idx) => {
                const stockAvailable = si.itemId ? calculateStock(si.itemId) : 0;
                return (
                  <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-850 flex items-center gap-2">
                    <select
                      value={si.itemId}
                      onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded p-1 text-slate-205 font-sans text-[9px]/none min-w-0"
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} — (SKU: {i.sku}) (In Shop: {calculateStock(i.id)} pcs)
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5 shrink-0 text-[8px]">
                      <div className="w-10">
                        <label className="text-slate-500 block text-[6px] text-center font-bold">QTY (PCS)</label>
                        <input
                          type="number"
                          min="1"
                          value={si.quantity}
                          onChange={(e) => handleRowChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-900 border border-slate-800 rounded text-center text-pink-400 font-bold p-0.5"
                          required
                        />
                      </div>

                      <div className="w-12">
                        <label className="text-slate-500 block text-[6px] text-center font-bold">SP RATE (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={si.rate}
                          onChange={(e) => handleRowChange(idx, "rate", Math.max(1, parseInt(e.target.value) || 0))}
                          disabled={!isManagerMode}
                          className={`w-full bg-slate-900 border border-slate-800 rounded text-center p-0.5 ${isManagerMode ? 'text-slate-100 font-bold cursor-text focus:border-pink-500' : 'text-slate-500 cursor-not-allowed select-none'}`}
                          title={!isManagerMode ? "Employee mode handles static SP. Unlock manager context to override sell prices." : "Override dynamic sell price"}
                          required
                        />
                      </div>
                    </div>

                    {saleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 text-rose-450 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded cursor-pointer shrink-0"
                      >
                        <Trash className="h-3 w-3 shrink-0" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-[8px] font-bold text-slate-300 transition flex items-center gap-1 select-none cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5 text-pink-500" /> [ADD ANOTHER CART SKU]
            </button>
          </div>

          {/* Pricing computations */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[9px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>ITEMS SUB-TOTAL:</span>
              <span className="text-slate-200">₹{draftSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 border-b border-slate-900 pb-1">
              <span>CGST (9%) & SGST (9%) CODES ACCRUED:</span>
              <span className="text-teal-400 font-extrabold">₹{draftGstTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>DISCOUNT / REBATE APPLIED (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-slate-900 border border-slate-800 rounded text-right p-0.5 text-slate-300 font-mono text-[9.5px]/none"
              />
            </div>
            <div className="flex justify-between text-pink-400 font-black border-t border-slate-900 pt-1.5 text-[10.5px]">
              <span>NET PAYABLE TAX INVOICE GRAND TOTAL:</span>
              <span className="text-pink-400 font-black">₹{draftGrandTotal.toLocaleString()}</span>
            </div>
          </div>

          {feedback && (
            <div className={`p-2 rounded text-[8.5px] font-mono leading-normal text-center ${feedback.startsWith("Error") || feedback.startsWith("Insufficient") ? "bg-rose-500/10 border border-rose-500/20 text-rose-455" : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 animate-pulse"}`}>
              {feedback}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-black rounded-lg cursor-pointer tracking-wider transition uppercase shadow shadow-pink-500/20"
          >
            Generate & Commit Sale Invoice
          </button>
        </form>
      </div>

      {/* RENDER ACTIVE PRINTING INVOICE CARD receipt */}
      {activeInvoice && (
        <div 
          id="gst-invoice-printer-preview" 
          className="bg-white border border-slate-300 rounded-xl p-3.5 text-slate-950 font-sans shadow-2xl relative overflow-hidden space-y-3 speak-none animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <p className="text-[13px] font-black tracking-wider text-pink-600 uppercase font-mono">SIDIVNIYAK BEAUTY & COSMETICS</p>
              <p className="text-[7.5px] text-slate-500 font-mono uppercase tracking-tight leading-none">Cosmetics Retail Outlet, Mumbai, MH</p>
              <p className="text-[7px] text-slate-400 font-mono uppercase tracking-tight leading-none mt-1">GSTIN: 27SIDIV9802F1Z4</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[7.5px] px-1 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-700 uppercase tracking-widest leading-none">TAX INVOICE</span>
              <p className="text-[8px] font-mono text-slate-600 mt-1 leading-none font-bold">#{activeInvoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 text-[8px] font-mono text-slate-600 border-b border-slate-100 pb-2 gap-y-1">
            <div>
              <span className="text-slate-400 uppercase block text-[6.5px]">CUSTOMER DETAILS</span>
              <strong className="text-slate-800">{activeInvoice.customerName}</strong>
              {activeInvoice.customerPhone && <p className="leading-none mt-0.5">Ph: {activeInvoice.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase block text-[6.5px]">DATE OF SALE</span>
              <p className="font-bold text-slate-800">{activeInvoice.saleDate}</p>
              {activeInvoice.customerGstin && <p className="text-[7px] text-pink-600 font-bold leading-none mt-0.5">Customer GSTIN: {activeInvoice.customerGstin}</p>}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded border border-slate-100">
            <table className="w-full text-left text-[8px] font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-250">
                  <th className="p-1 px-1.5 font-bold">ITEM SPEC</th>
                  <th className="p-1 px-1.5 text-right font-bold">QTY</th>
                  <th className="p-1 px-1.5 text-right font-bold">RATE</th>
                  <th className="p-1 px-1.5 text-right font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoice.items.map((item: any, id: number) => (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-1 px-1.5 font-sans font-semibold text-slate-800">{item.name} <span className="text-[6.5px] text-slate-400 font-mono block">SKU: {item.sku}</span></td>
                    <td className="p-1 px-1.5 text-right text-slate-550 font-bold">{item.quantity} PCS</td>
                    <td className="p-1 px-1.5 text-right text-slate-500">₹{item.rate}</td>
                    <td className="p-1 px-1.5 text-right font-black text-slate-800">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-2 rounded text-[8px] font-mono space-y-0.5 border border-slate-100 text-slate-700 text-right leading-relaxed">
            <div>SUBTOTAL TAXABLE VALUE: <span className="text-slate-900 font-bold">₹{activeInvoice.subtotal}</span></div>
            <div>CGST TAX COLLECTED (9%): <span className="text-slate-900 font-semibold">₹{activeInvoice.cgstTotal}</span></div>
            <div>SGST TAX COLLECTED (9%): <span className="text-slate-900 font-semibold">₹{activeInvoice.sgstTotal}</span></div>
            {activeInvoice.discount > 0 && <div className="text-rose-500 font-bold">DISCOUNT APPLIED: -₹{activeInvoice.discount}</div>}
            <div className="text-[9.5px] text-pink-600 font-black border-t border-slate-200 pt-1.5 uppercase tracking-wide leading-none">GRAND REVENUE PAYABLE: ₹{activeInvoice.grandTotal}</div>
          </div>

          {/* Export & Share Panel */}
          <div className="border-t border-b border-slate-100 py-2 space-y-2">
            <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider font-mono">EXPORT & SHARE OPTIONS</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => downloadPdf(activeInvoice)}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Download className="h-2.5 w-2.5 text-pink-600 font-bold" /> DOWNLOAD PDF
              </button>
              <button
                type="button"
                onClick={() => sharePdf(activeInvoice)}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Share2 className="h-2.5 w-2.5 text-pink-600 font-bold" /> SHARE PDF FILE
              </button>
              <button
                type="button"
                onClick={() => whatsappShare(activeInvoice)}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Send className="h-2.5 w-2.5 text-emerald-600 font-bold" /> WHATSAPP SHARE
              </button>
              <button
                type="button"
                onClick={() => emailShare(activeInvoice)}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
              >
                <Mail className="h-2.5 w-2.5 text-sky-600 font-bold" /> EMAIL INVOICE
              </button>
            </div>
          </div>

          <div className="text-center text-slate-400 text-[6.5px] font-mono">
            Thank you for shopping at SIDIVNIYAK Beauty! <br />
            This is an append-only digital cash memo generated with Indian GST standards compliance rules.
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => printInvoice(activeInvoice)}
              className="flex-1 py-1 px-2 bg-slate-950 hover:bg-slate-850 text-white font-mono text-[8.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 shadow select-none"
            >
              <Printer className="h-3 w-3 shrink-0" /> PRINT BILL INVOICE
            </button>
            <button
              onClick={() => setActiveInvoice(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-mono text-[8.5px] font-semibold rounded cursor-pointer transition select-none"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

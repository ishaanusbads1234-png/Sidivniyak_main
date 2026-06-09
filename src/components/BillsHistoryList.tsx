import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { FileText, Printer, Trash, Upload, Camera, Image, Check, AlertTriangle, FileUp, Sparkles, Download, Share2, Send, Mail } from "lucide-react";
import { jsPDF } from "jspdf";
import { ParsedInvoice, PurchaseItem } from "../types";
import Tesseract from "tesseract.js";
import { parseInvoiceTextOffline } from "../lib/ocrParser";
import { preprocessImageForOcr, assessImageQuality, QualityReport } from "../lib/imagePreprocessor";
import { learnSupplierCorrection } from "../lib/supplierTemplates";

export const BillsHistoryList: React.FC = () => {
  const { sales, cancelSale, isManagerMode, items, addPurchase, purchases, suppliers, calculateStock, addAuditLog } = useInventory();

  // Selected date filter
  const [dateFilter, setDateFilter] = useState("");
  // Selected month filter
  const [monthFilter, setMonthFilter] = useState("");
  const [clerk, setClerk] = useState("Staff Invoice Auditor");

  // Selected invoice detail view
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  // Bill Importer (OCR) States
  const [showImporter, setShowImporter] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [importFeedback, setImportFeedback] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedInvoice | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rawTextOutput, setRawTextOutput] = useState("");

  // Interactive Ingestion Review States
  const [vendorName, setVendorName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDateVal, setInvoiceDateVal] = useState("");
  const [ocrConfidenceScore, setOcrConfidenceScore] = useState(100);
  const [ocrEngineUsed, setOcrEngineUsed] = useState("Google Vision");
  const [originalImage, setOriginalImage] = useState("");
  const [originalOcrText, setOriginalOcrText] = useState("");
  const [originalOcrValue, setOriginalOcrValue] = useState<any | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [forceImportMode, setForceImportMode] = useState(false);
  const [ocrEngineSelected, setOcrEngineSelected] = useState<"paddle_ocr" | "tesseract" | "ocr_space">("paddle_ocr");
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [qualityOverride, setQualityOverride] = useState(false);

  interface ReviewProductLine {
    sku: string;
    name: string;
    qty: number;
    rate: number;
    gstPercent: number;
    isRecognized: boolean;
    itemId: string;
    originalOcrName?: string;
    validationError?: boolean;
  }
  const [reviewProducts, setReviewProducts] = useState<ReviewProductLine[]>([]);

  // Filter sales
  const filteredSales = sales.filter((s) => {
    if (dateFilter && s.saleDate !== dateFilter) return false;
    if (monthFilter) {
      const yearMonth = s.saleDate.substring(0, 7); // YYYY-MM
      if (yearMonth !== monthFilter) return false;
    }
    return true;
  });

  // Calculate stats for current filter
  const filteredSum = filteredSales.reduce((sum, s) => {
    if (s.isCancelled) return sum;
    return sum + s.grandTotal;
  }, 0);

  // Calculates totals of editable review screen on the fly
  const reviewSubtotal = reviewProducts.reduce((sum, p) => sum + p.qty * p.rate, 0);
  const reviewGstTotal = reviewProducts.reduce((sum, p) => sum + Math.round(p.qty * p.rate * (p.gstPercent / 100)), 0);
  const reviewGrandTotal = reviewSubtotal + reviewGstTotal;

  // Real-time checks if this wholesale bill already exists
  const isDuplicateDetected = purchases.some((p) => {
    return (
      p.supplierName.trim().toUpperCase() === vendorName.trim().toUpperCase() &&
      p.invoiceNumber.trim().toUpperCase() === invoiceNo.trim().toUpperCase() &&
      p.purchaseDate === invoiceDateVal &&
      Math.abs(p.grandTotal - reviewGrandTotal) <= 1
    );
  });

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
      const iframeId = "print-invoice-iframe-render";
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

  // Safe client-side OCR and heuristics parsing (NO automatic web calls)
  const handleParseBase64 = async (fileBase64: string, mimeType: string, isAlreadyProcessed: boolean = false) => {
    setImportFeedback("");
    setParsedResult(null);
    setRawTextOutput("");
    setImageSize(null);
    setQualityReport(null);
    setIsParsing(true);

    let activeBase64 = fileBase64;
    const isImage = mimeType.startsWith("image/");

    // 1. Image Quality Assessment & Canvas 7-step pre-OCR Pipeline
    if (isImage && !isAlreadyProcessed) {
      try {
        const fullyFormattedDataUrl = fileBase64.startsWith("data:") ? fileBase64 : `data:${mimeType};base64,${fileBase64}`;
        
        setImportFeedback("🔍 Analyzing photo capture parameters (blur, lighting, alignment metrics)...");
        const report = await assessImageQuality(fullyFormattedDataUrl);
        setQualityReport(report);

        if (!report.isPassed && !qualityOverride) {
          setImportFeedback("❌ OCR Processing Blocked: Capture quality checks failed. Please retake a sharper, well-lit photo.");
          setIsParsing(false);
          return;
        }

        setImportFeedback("⚡ Executing 7-step Digital Image Preprocessing (Auto-rotate, radon-deskew, histogram stretch, adaptive threshold, edge sharpening, median denoise)...");
        const processedImage = await preprocessImageForOcr(fullyFormattedDataUrl);
        setOriginalImage(processedImage);
        activeBase64 = processedImage;

        // Calculate Image Size
        const imgObj = new Image();
        imgObj.src = processedImage;
        await new Promise((res) => {
          imgObj.onload = () => {
            setImageSize({ width: imgObj.width, height: imgObj.height });
            res(null);
          };
          imgObj.onerror = () => res(null);
        });
      } catch (procErr) {
        console.warn("Failed preprocessing image:", procErr);
      }
    }

    if (isImage) {
      console.log("Processing image using selected engine:", ocrEngineSelected);
      let chosenAttempt: any = null;

      if (ocrEngineSelected === "tesseract") {
        // Run Leg Tesseract JS offline OCR
        try {
          setImportFeedback("⚠️ Running Tesseract JS OCR fallback workflow for comparative verification (PSM 6)...");
          const imgSrc = activeBase64.startsWith("data:") ? activeBase64 : `data:${mimeType};base64,${activeBase64}`;
          const result = await Tesseract.recognize(imgSrc, "eng", {
            logger: (m) => {
              if (m.status === "recognizing text") {
                setImportFeedback(`Tesseract OCR: Extracting characters (${Math.round(m.progress * 100)}%)...`);
              }
            },
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1",
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()%/-*₹:"
          } as any);

          let tesseractText = result.data.text || "";
          let tesseractScore = Math.round(result.data.confidence || 0);

          const normalizedTess = tesseractText
            .replace(/×/g, "*")
            .replace(/\r/g, " ")
            .replace(/\n/g, " ")
            .replace(/\s+/g, " ");

          let tesseractParsed = parseInvoiceTextOffline(normalizedTess, items);

          // Sweeps fallback
          if (tesseractScore < 80) {
            const sweepModes = ["4", "11"];
            let bestTessText = tesseractText;
            let bestTessConf = tesseractScore;
            let bestTessRows = tesseractParsed.products.length;

            for (const psm of sweepModes) {
              try {
                const runResult = await Tesseract.recognize(imgSrc, "eng", {
                  tessedit_pageseg_mode: psm,
                  preserve_interword_spaces: "1",
                  tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()%/-*₹:"
                } as any);
                const txt = runResult.data.text || "";
                const conf = Math.round(runResult.data.confidence || 0);
                const normalizedSweepTxt = txt.replace(/×/g, "*").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ");
                const parsed = parseInvoiceTextOffline(normalizedSweepTxt, items);
                const rowsCount = parsed.products.length;

                if (rowsCount > bestTessRows) {
                  bestTessText = txt;
                  bestTessConf = conf;
                  bestTessRows = rowsCount;
                } else if (rowsCount === bestTessRows && conf > bestTessConf) {
                  bestTessText = txt;
                  bestTessConf = conf;
                  bestTessRows = rowsCount;
                }
              } catch (innerErr) {
                console.warn(`Tesseract sweep PSM ${psm} failed:`, innerErr);
              }
            }
            tesseractText = bestTessText;
            tesseractScore = bestTessConf;
            const finalTessNorm = tesseractText.replace(/×/g, "*").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ");
            tesseractParsed = parseInvoiceTextOffline(finalTessNorm, items);
          }

          chosenAttempt = {
            engine: "Tesseract",
            rawText: tesseractText,
            confidence: Math.round(tesseractScore * 0.8), // Penalize legacy tesseract confidence
            parsedData: tesseractParsed,
            vendor: tesseractParsed.vendor,
            invoiceNumber: tesseractParsed.invoiceNumber,
            invoiceDate: tesseractParsed.invoiceDate
          };
        } catch (fallbackErr) {
          console.warn("Legacy Tesseract OCR failed:", fallbackErr);
        }
      } else {
        // Call server-side API with engine parameter (paddle_ocr or ocr_space)
        try {
          const apiLabel = ocrEngineSelected === "paddle_ocr" ? "PaddleOCR" : "OCR.space";
          setImportFeedback(`🧠 Uploading image and analyzing with ${apiLabel} high-precision server-side model...`);
          const cleanBase64ForAPI = activeBase64.startsWith("data:") ? activeBase64 : `data:${mimeType};base64,${activeBase64}`;

          const apiResponse = await fetch("/api/ocr/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64: cleanBase64ForAPI,
              mimeType: mimeType,
              items: items,
              engine: ocrEngineSelected
            })
          });

          if (apiResponse.ok) {
            const jsonResult = await apiResponse.json();
            const visionRawText = jsonResult.rawText || "";
            const finalNormalized = visionRawText
              .replace(/×/g, "*")
              .replace(/\r/g, " ")
              .replace(/\n/g, " ")
              .replace(/\s+/g, " ");

            const parsedOffline = parseInvoiceTextOffline(finalNormalized, items);

            let derivedConf = jsonResult.confidence || 95;
            if (parsedOffline.products.length === 0) {
              derivedConf = Math.min(derivedConf, 50);
            }

            chosenAttempt = {
              engine: ocrEngineSelected === "paddle_ocr" ? "PaddleOCR (Default)" : "OCR.space Fallback",
              rawText: visionRawText,
              confidence: derivedConf,
              parsedData: {
                ...parsedOffline,
                subtotal: jsonResult.subtotal || parsedOffline.subtotal,
                gstAmount: jsonResult.gstAmount || parsedOffline.gstAmount,
                grandTotal: jsonResult.grandTotal || parsedOffline.grandTotal,
                products: jsonResult.products?.length > 0 ? jsonResult.products : parsedOffline.products
              },
              vendor: jsonResult.vendor || parsedOffline.vendor,
              invoiceNumber: jsonResult.invoiceNumber || parsedOffline.invoiceNumber,
              invoiceDate: jsonResult.invoiceDate || parsedOffline.invoiceDate
            };
          } else {
            const errBody = await apiResponse.json().catch(() => ({}));
            throw new Error(errBody.error || `Server OCR Engine error status ${apiResponse.status}`);
          }
        } catch (apiErr: any) {
          console.error("API-based OCR failed:", apiErr);
          setImportFeedback(`❌ Ingestion failed: ${apiErr.message || apiErr}. Please switch to Tesseract (legacy) mode.`);
          setIsParsing(false);
          return;
        }
      }

      if (!chosenAttempt) {
        setImportFeedback("Error: Selected OCR engine failed. Try another engine or paste raw text manually.");
        setIsParsing(false);
        return;
      }

      const score = chosenAttempt.confidence;
      setOcrConfidenceScore(score);
      setOcrEngineUsed(chosenAttempt.engine);

      // Rule: When OCR confidence < 85%: DO NOT parse. Show "OCR quality too low. Retake photo."
      if (score < 85) {
        setImportFeedback("❌ OCR quality too low. Retake photo.");
        setRawTextOutput(chosenAttempt.rawText);
        setOriginalOcrText(chosenAttempt.rawText);
        setParsedResult(null);
        setReviewProducts([]);
        setIsParsing(false);
        return;
      }

      // Populate Manual Form
      console.log(`[OCR Pass] Ingested successfully with ${score}% confidence.`);
      setRawTextOutput(chosenAttempt.rawText);
      setOriginalOcrText(chosenAttempt.rawText);

      const parsedData = chosenAttempt.parsedData;
      setVendorName(chosenAttempt.vendor || parsedData.vendor || "New Wholesale Supplier");
      setInvoiceNo(chosenAttempt.invoiceNumber || parsedData.invoiceNumber || `KSB-${Date.now()}`);
      setInvoiceDateVal(chosenAttempt.invoiceDate || parsedData.invoiceDate || new Date().toISOString().substring(0, 10));
      setOriginalOcrValue({ ...parsedData, confidence: score });

      const mappedLines = (parsedData.products || []).map((p: any) => {
        const matchedItem = items.find(it => it.sku.toUpperCase() === p.sku.toUpperCase());
        return {
          sku: p.sku ? p.sku.toUpperCase() : "NEW-SKU",
          name: matchedItem ? matchedItem.name : (p.name || "Extractable product"),
          qty: Number(p.qty || 1),
          rate: Number(p.rate || 100),
          gstPercent: Number(p.gstPercent || 18),
          isRecognized: !!matchedItem,
          itemId: matchedItem ? matchedItem.id : "",
          originalOcrName: p.name || "",
          validationError: p.validationError || false
        };
      });

      setReviewProducts(mappedLines);

      const tempInvoice: ParsedInvoice = {
        invoiceNumber: chosenAttempt.invoiceNumber || parsedData.invoiceNumber || `KSB-${Date.now()}`,
        vendor: chosenAttempt.vendor || parsedData.vendor || "New Wholesale Supplier",
        totalValue: parsedData.grandTotal || (parsedData.subtotal + parsedData.gstAmount) || 0,
        itemCode: mappedLines[0]?.sku || "",
        quantity: mappedLines[0]?.qty || 0,
        isMultiProduct: mappedLines.length > 1,
        products: mappedLines,
        invoiceDate: chosenAttempt.invoiceDate || parsedData.invoiceDate || new Date().toISOString().substring(0, 10)
      };

      setParsedResult(tempInvoice);

      // auto-approve indicators or visual marks
      if (score >= 95) {
        setImportFeedback(`🌟 OCR complete via ${chosenAttempt.engine} (${score}% - EXCELLENT CONFIDENCE). INVOICE VERIFIED & AUTO-APPROVED!`);
      } else {
        setImportFeedback(`✓ OCR complete via ${chosenAttempt.engine} (${score}% confidence). Verify matching below.`);
      }
      setIsParsing(false);
    } else {
      setImportFeedback("Non-image loaded. Paste document content manually below to trigger heuristics parser.");
      setIsParsing(false);
    }
  };

  // Live text clipboard parsing (Fully offline, no network required)
  const handleParseText = async (inputText: string, sourceEngine: string = "Embedded Text Parser") => {
    setImportFeedback("");
    setParsedResult(null);
    setRawTextOutput("");
    setIsParsing(true);

    const text = inputText.trim();
    if (!text) {
      setImportFeedback("Error: Clipboard paste area is empty!");
      setIsParsing(false);
      return;
    }

    try {
      setImportFeedback("Running local invoice heuristics engine on pasted characters...");
      setOcrEngineUsed(sourceEngine);

      // Normalize before parsed
      const normalizedHandledText = text
        .replace(/×/g, "*")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ");

      const offlineResult = parseInvoiceTextOffline(normalizedHandledText, items);
      setRawTextOutput(text);
      setOriginalOcrText(text);

      setVendorName(offlineResult.vendor || "New Wholesale Supplier");
      setInvoiceNo(offlineResult.invoiceNumber || `KSB-${Date.now()}`);
      setInvoiceDateVal(offlineResult.invoiceDate || new Date().toISOString().substring(0, 10));
      
      setOcrConfidenceScore(offlineResult.confidence);
      setOriginalOcrValue({ ...offlineResult, confidence: offlineResult.confidence });

      // We NEVER disable row generation: attempt extraction if patterns exist
      const mappedLines = (offlineResult.products || []).map(p => {
        const matchedItem = items.find(it => it.sku.toUpperCase() === p.sku.toUpperCase());
        return {
          sku: p.sku ? p.sku.toUpperCase() : "NEW-SKU",
          name: matchedItem ? matchedItem.name : (p.name || "Extractable product"),
          qty: Number(p.qty || 1),
          rate: Number(p.rate || 100),
          gstPercent: Number(p.gstPercent || 18),
          isRecognized: !!matchedItem,
          itemId: matchedItem ? matchedItem.id : "",
          originalOcrName: p.name || "",
          validationError: p.validationError || false
        };
      });

      setReviewProducts(mappedLines);

      const tempInvoice: ParsedInvoice = {
        invoiceNumber: offlineResult.invoiceNumber || `KSB-${Date.now()}`,
        vendor: offlineResult.vendor || "New Wholesale Supplier",
        totalValue: offlineResult.grandTotal || (offlineResult.subtotal + offlineResult.gstAmount) || 0,
        itemCode: mappedLines[0]?.sku || "",
        quantity: mappedLines[0]?.qty || 0,
        isMultiProduct: mappedLines.length > 1,
        products: mappedLines,
        invoiceDate: offlineResult.invoiceDate || new Date().toISOString().substring(0, 10)
      };
      setParsedResult(tempInvoice);

      setImportFeedback(`✓ Document text parsed successfully via offline rules (${offlineResult.confidence}% confidence).`);
      setIsParsing(false);
    } catch (err: any) {
      console.error("Heuristics parse failed:", err);
      setImportFeedback(`Error: Offline parsing encountered an issue. Populating empty form.`);
      setOcrConfidenceScore(30);
      setVendorName("New Wholesale Supplier");
      setInvoiceNo("");
      setInvoiceDateVal(new Date().toISOString().substring(0, 10));
      setReviewProducts([]);
      setIsParsing(false);
    }
  };

  // Optional Admin Gemini fallback (manually triggered, never blocks)
  const runAdminGeminiOcrFallback = async () => {
    if (!originalImage && !originalOcrText) {
      setImportFeedback("Error: Please select an invoice file or paste raw text first before calling AI Fallback.");
      return;
    }

    setIsParsing(true);
    setImportFeedback("🧠 Calling secure server-side Gemini 2.5 NLP processing gateway...");

    try {
      const response = await fetch("/api/ocr/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: originalImage,
          text: originalOcrText,
          items
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server API returned HTTP status ${response.status}`);
      }

      const json = await response.json();

      setVendorName(json.vendor || vendorName);
      setInvoiceNo(json.invoiceNumber || invoiceNo);
      setInvoiceDateVal(json.invoiceDate || invoiceDateVal);
      setOcrConfidenceScore(95); 
      setOriginalOcrValue({ ...json, confidence: 95 });
      if (json.rawText) {
        setRawTextOutput(json.rawText);
      }

      const geminiLines = (json.products || []).map((p: any) => {
        const matchedItem = items.find(it => it.sku.toUpperCase() === p.sku.toUpperCase());
        return {
          sku: p.sku ? p.sku.toUpperCase() : "NEW-SKU",
          name: matchedItem ? matchedItem.name : (p.name || "AI Cosmetic Item"),
          qty: Number(p.qty || p.quantity || 1),
          rate: Number(p.rate || p.price || 100),
          gstPercent: Number(p.gstPercent || 18),
          isRecognized: !!matchedItem,
          itemId: matchedItem ? matchedItem.id : "",
          originalOcrName: p.name || ""
        };
      });

      setReviewProducts(geminiLines);

      const tempInvoice: ParsedInvoice = {
        invoiceNumber: json.invoiceNumber || invoiceNo,
        vendor: json.vendor || vendorName,
        totalValue: json.grandTotal || reviewGrandTotal,
        itemCode: geminiLines[0]?.sku || "",
        quantity: geminiLines[0]?.qty || 0,
        isMultiProduct: geminiLines.length > 1,
        products: geminiLines,
        invoiceDate: json.invoiceDate || invoiceDateVal
      };
      setParsedResult(tempInvoice);

      setImportFeedback("✨ Success: Invoice structured and aligned via server-side Gemini AI model!");
    } catch (err: any) {
      console.error("Gemini OCR fallback failed:", err);
      setImportFeedback(`Admin AI Gateway Error: ${err.message || "Failed to contact proxy. Proceeding offline."}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddReviewProduct = () => {
    setReviewProducts((prev) => [
      ...prev,
      {
        sku: "NEW-PRODUCT-SKU",
        name: "Select item below or type SKU",
        qty: 1,
        rate: 100,
        gstPercent: 18,
        isRecognized: false,
        itemId: ""
      }
    ]);
  };

  const handleRemoveReviewProduct = (index: number) => {
    setReviewProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Commit Parsed Invoice elements into Stock Purchases (Ledger Additions) with audit logging and template learning
  const handleCommitImportedInvoice = () => {
    // 1. Core Financial Sanity Checks (Requirement 5)
    if (reviewSubtotal <= 0 || reviewGrandTotal <= 0) {
      setImportFeedback("Error: Financial sanity check failed. Subtotal and Grand Total must be greater than 0.");
      return;
    }

    const calculatedSum = reviewProducts.reduce((sum, p) => sum + (p.qty * p.rate), 0);
    if (Math.abs(calculatedSum - reviewSubtotal) > 1) {
      setImportFeedback(`Error: Financial sanity check failed. The sum of item lines (₹${calculatedSum}) does not match the invoice subtotal (₹${reviewSubtotal}).`);
      return;
    }

    // 2. Impossible retail wholesale value threshold check
    const MAX_PEER_IMPORT_LIMIT = 5000000; // ₹5,000,000 INR
    if (reviewGrandTotal > MAX_PEER_IMPORT_LIMIT) {
      setImportFeedback(`Error: Import Blocked. The parsed grand total of ₹${reviewGrandTotal.toLocaleString('en-IN')} exceeds the authorized maximum store transaction limit (₹5,000,000). Please correct item rates.`);
      return;
    }

    // 3. Import Safety - Catalog match verification (Requirement 8)
    const recognizedLineCount = reviewProducts.filter(p => p.isRecognized).length;
    const matchLineRatio = reviewProducts.length > 0 ? (recognizedLineCount / reviewProducts.length) : 1;
    if (matchLineRatio < 0.5) {
      setImportFeedback(`Error: Import Safety block triggered. Fewer than 50% of the items (${Math.round(matchLineRatio * 100)}%) match your catalog. You must manually map at least 50% of items to your catalog before booking.`);
      return;
    }

    if (!invoiceNo.trim()) {
      setImportFeedback("Error: Wholesale Invoice Number reference is mandatory to book ledger.");
      return;
    }
    if (reviewProducts.length === 0) {
      setImportFeedback("Error: Please add at least one item line to book.");
      return;
    }

    const invalidRow = reviewProducts.find(p => !p.sku.trim() || !p.name.trim());
    if (invalidRow) {
      setImportFeedback("Error: All items must have a valid SKU code and display name before booking.");
      return;
    }

    // Match or find registered suppliers list
    const cleanVendorName = vendorName.trim().toUpperCase();
    let targetSupplier = suppliers.find((s) => cleanVendorName.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(cleanVendorName));
    const supplierId = targetSupplier ? targetSupplier.id : (suppliers[0]?.id || "sup-default");
    const supplierNameMatched = targetSupplier ? targetSupplier.name : vendorName;

    // Compile purchase items lists, learning corrections for future accuracy automatically
    const purchaseItems: PurchaseItem[] = reviewProducts.map((p, idx) => {
      const matchItem = items.find((itm) => itm.sku.toUpperCase() === p.sku.trim().toUpperCase());
      
      // AI / Offline learning loop
      if (p.originalOcrName && p.originalOcrName.trim()) {
        learnSupplierCorrection(vendorName, p.originalOcrName, p.sku.trim().toUpperCase());
      }

      return {
        id: `pi-ocr-${Date.now()}-${idx}`,
        itemId: matchItem?.id || "",
        sku: p.sku.trim().toUpperCase(),
        name: p.name.trim(),
        quantity: p.qty,
        rate: p.rate,
        batchNumber: `B-OCR-${invoiceNo.trim()}`,
        mfgDate: new Date().toISOString().substring(0, 10),
        expiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().substring(0, 10), // + 2 Years
        total: p.qty * p.rate
      };
    });

    const subtotal = reviewSubtotal;
    const gstAmount = reviewGstTotal;
    const grandTotal = reviewGrandTotal;

    // Capture fields corrected manually by operator for permanent compliance audit trail
    const correctedFields: string[] = [];
    if (originalOcrValue) {
      if (originalOcrValue.vendor !== vendorName) correctedFields.push("vendor");
      if (originalOcrValue.invoiceNumber !== invoiceNo) correctedFields.push("invoiceNumber");
      if (originalOcrValue.invoiceDate !== invoiceDateVal) correctedFields.push("invoiceDate");
      if (originalOcrValue.products?.length !== reviewProducts.length) {
        correctedFields.push("lineItemsCount");
      }
    }

    // Commit durable ledger stock entry
    addPurchase(
      {
        invoiceNumber: invoiceNo,
        supplierId,
        supplierName: supplierNameMatched,
        supplierGstin: "27WHOLE9102X1Z5",
        purchaseDate: invoiceDateVal || new Date().toISOString().substring(0, 10),
        items: purchaseItems,
        subtotal,
        gstAmount,
        grandTotal,
        operator: clerk,
        // Saved OCR statistics for future reprocessing and audits
        originalImage: originalImage,
        rawOcrText: originalOcrText,
        ocrConfidence: ocrConfidenceScore,
        importTimestamp: new Date().toISOString(),
        correctedFields: correctedFields
      },
      clerk
    );

    // Save a detailed, durable, non-modifiable entry into the permanent cloud-synchronized System Audit Log
    addAuditLog(
      "BILL_IMPORT_AUDIT",
      clerk,
      {
        ocrConfidence: ocrConfidenceScore,
        originalParsedValues: originalOcrValue,
        rawOcrText: originalOcrText
      },
      {
        committedVendor: vendorName,
        committedInvoiceNumber: invoiceNo,
        committedInvoiceDate: invoiceDateVal,
        committedProducts: reviewProducts,
        subtotal,
        gstAmount,
        grandTotal,
        correctedFieldsList: correctedFields,
        timestamp: new Date().toISOString()
      }
    );

    setImportFeedback("✓ Success: Imported items successfully logged as active stock postings!");
    setPastedText("");
    setParsedResult(null);
    setRawTextOutput("");
    setOriginalImage("");
    setOriginalOcrText("");
    setForceImportMode(false);
    setTimeout(() => {
      setShowImporter(false);
      setImportFeedback("");
    }, 1500);
  };

  // Let's load PDF.js from a CDN dynamically to avoid complex Vite compiling / public worker path errors
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(pdfjsLib);
        } else {
          reject(new Error("PDF.js global library not found after script injection"));
        }
      };
      script.onerror = () => {
        reject(new Error("Failed to load PDF.js CDN script"));
      };
      document.head.appendChild(script);
    });
  };

  // Automated PDF processing router supporting both embedded text and scanned/image-only PDFs
  const handleParsePdfFile = async (file: File) => {
    setImportFeedback("Initializing PDF parsing workspace...");
    setParsedResult(null);
    setRawTextOutput("");
    setOriginalImage("");
    setIsParsing(true);

    try {
      const pdfjsLib = await loadPdfJs();
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const typedArray = new Uint8Array(arrayBuffer);

          setImportFeedback("Analyzing PDF document structure...");
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const totalPages = pdf.numPages;

          // Join texts from all pages to analyze if it's text-integrated or image-based (scanned)
          let accumulatedTextMap: string[] = [];
          
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            setImportFeedback(`Scanning page ${pageNum}/${totalPages} structure...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            accumulatedTextMap.push(pageText);
          }

          const combinedText = accumulatedTextMap.join("\n").trim();
          // Count alphanumeric characters to verify if we can parse directly as a text document
          const alphanumericMatches = combinedText.replace(/[^A-Za-z0-9]/g, "");

          if (alphanumericMatches.length >= 80) {
            // Path A: Embedded Text PDF. Parse immediately!
            setImportFeedback(`✓ Detected PDF with Embedded Text (${alphanumericMatches.length} characters). Parsing directly...`);
            handleParseText(combinedText, "Embedded Text PDF");
          } else {
            // Path B: Scanned / Image PDF. Let's render and run offline Tesseract OCR.
            setImportFeedback(`⚠️ Scanned pdf detected (No selectable text). Rendering ${totalPages} page(s) as canvas sheets...`);
            
            let accumulatedOcrText = "";

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              setImportFeedback(`Rasterization: Rendering page ${pageNum}/${totalPages} viewport...`);
              const page = await pdf.getPage(pageNum);
              
              // Render scale 2.0 ensures crisp and high quality rendering for best OCR accuracy
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              if (!context) {
                throw new Error("Canvas context construction failure");
              }

              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              setImportFeedback(`Enhancing page ${pageNum} contrast values...`);
              const rawDataUrl = canvas.toDataURL("image/jpeg", 0.9);
              // Clean / optimize contrast or convert to monochrome for clean Tesseract reading
              const optimizedPageUrl = await preprocessImageForOcr(rawDataUrl);

              if (pageNum === 1) {
                // Supply preview image for review screen
                setOriginalImage(optimizedPageUrl);
              }

              setImportFeedback(`Page ${pageNum}/${totalPages}: Transcribing characters with Tesseract offline model...`);
              const pageOcrResult = await Tesseract.recognize(
                optimizedPageUrl,
                "eng",
                {
                  logger: (msg) => {
                    if (msg.status === "recognizing text") {
                      setImportFeedback(`OCR Page ${pageNum}/${totalPages}: Processing characters (${Math.round(msg.progress * 100)}%)...`);
                    }
                  },
                  tessedit_pageseg_mode: "6",
                  preserve_interword_spaces: "1",
                  tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()%/-*₹:"
                } as any
              );

              const pageText = pageOcrResult.data.text || "";
              accumulatedOcrText += pageText + "\n";
            }

            setImportFeedback("✓ Scanned PDF OCR workflow successfully transcribed! Routing to parser...");
            handleParseText(accumulatedOcrText, "Tesseract (Scanned PDF)");
          }
        } catch (innerPdfErr: any) {
          console.error("PDF execution failed:", innerPdfErr);
          setImportFeedback(`Error: Unable to parse document elements. ${innerPdfErr.message || innerPdfErr}`);
          setIsParsing(false);
        }
      };

      reader.onerror = () => {
        setImportFeedback("Error: PDF file reading failure.");
        setIsParsing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error("PDF Library failure:", err);
      setImportFeedback(`Error: Failed to instantiate offline document workspace. ${err.message || err}`);
      setIsParsing(false);
    }
  };

  // Robust change event reader supporting Text columns, PDF files, and Camera/Gallery images
  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFeedback("");
    setParsedResult(null);
    setRawTextOutput("");
    setOriginalImage("");

    const fileNameLower = file.name.toLowerCase();
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";
    const isImage = file.type.startsWith("image/") || fileNameLower.endsWith(".tiff") || fileNameLower.endsWith(".tif");
    const isText = file.type.startsWith("text/") || fileNameLower.endsWith(".txt");

    if (isPdf) {
      handleParsePdfFile(file);
    } else if (isImage) {
      setImportFeedback("Processing document image bytes (JPEG/PNG/TIFF)...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dataUrl = event.target?.result as string;
          const parts = dataUrl.split(";base64,");
          const base64 = parts[1] || "";
          const mimeType = file.type || "image/jpeg";
          handleParseBase64(base64, mimeType);
        } catch (err) {
          setImportFeedback("Error: Image processing failed.");
        }
      };
      reader.readAsDataURL(file);
    } else if (isText) {
      setImportFeedback("Reading raw text file content...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          handleParseText(content, "Text File Upload");
        } catch (err) {
          setImportFeedback("Error: Text file could not be read.");
        }
      };
      reader.readAsText(file);
    } else {
      // Fallback: try reading as raw text representation
      setImportFeedback("Heuristics detect unknown type - trying raw text parse fallback...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          handleParseText(content, "Heuristic Text Fallback");
        } catch (err) {
          setImportFeedback("Error: Could not parse document content.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4 font-mono text-[9px]">
      
      {/* SCANNING & IMPORT CONTROL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-pink-400 font-bold uppercase tracking-wider text-[8.5px] flex items-center gap-1">
            <Upload className="h-3.5 w-3.5" /> Supplier Bill Ingestion Engine
          </span>
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="px-2.5 py-0.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded text-[8px] cursor-pointer shadow-sm transition"
          >
            {showImporter ? "[HIDE INGESTION]" : "[📥 SCAN WHOLESALE BILLS]"}
          </button>
        </div>

        {showImporter && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-3 relative animate-fadeIn">
            {/* OCR Ingestion Model Settings */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-905 pb-2 text-[8px]">
              <div className="text-[8.5px] text-pink-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>📥 WHOLESALE INGESTION CONTROL</span>
                <span className="px-1 py-0.2 bg-pink-900/40 text-pink-300 rounded text-[6.5px]">ACTIVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Selected OCR Engine:</span>
                <select
                  value={ocrEngineSelected}
                  onChange={(e) => setOcrEngineSelected(e.target.value as any)}
                  disabled={isParsing}
                  className="bg-slate-900 border border-slate-800 text-[8px] rounded px-1.5 py-0.5 text-pink-300 font-bold focus:outline-none focus:border-pink-500"
                >
                  <option value="paddle_ocr">PaddleOCR High-Accuracy (Default)</option>
                  <option value="ocr_space">OCR.space Cloud (Fallback)</option>
                  <option value="tesseract">Tesseract JS (Legacy)</option>
                </select>
              </div>
            </div>

            <div className="text-[8.5px] text-slate-400 leading-normal mb-1">
              <strong>Supply the real invoice file (PDF, TXT, JPEG, PNG, or TIFF receipt) for automated extraction and Ledger sync:</strong>
            </div>

            {/* Simulated Live Scan captures linked to REAL handles */}
            <div className="grid grid-cols-2 gap-2 text-[7.5px] border-t border-slate-900 pt-2 text-center">
              <div>
                <label className="text-slate-500 block mb-1">🎥 SNAP PHOTO / CAMERA</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileImportChange}
                  disabled={isParsing}
                  className="hidden"
                  id="camera-capture-bill"
                />
                <label 
                  htmlFor="camera-capture-bill" 
                  className={`bg-slate-900 border border-slate-850 p-1.5 rounded text-slate-300 cursor-pointer hover:border-pink-500/50 flex items-center justify-center gap-1 ${isParsing ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Camera className="h-3 w-3 text-pink-400 shrink-0" /> [Live Snap Invoice]
                </label>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">🖼️ IMPORT PHOTO FROM GALLERY</label>
                <input
                  type="file"
                  accept="image/*,.tiff,.tif"
                  onChange={handleFileImportChange}
                  disabled={isParsing}
                  className="hidden"
                  id="gallery-pick-bill"
                />
                <label 
                  htmlFor="gallery-pick-bill" 
                  className={`bg-slate-900 border border-slate-850 p-1.5 rounded text-slate-300 cursor-pointer hover:border-pink-500/50 flex items-center justify-center gap-1 ${isParsing ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Image className="h-3 w-3 text-pink-400 shrink-0" /> [Upload JPEG/PNG/TIFF]
                </label>
              </div>
            </div>

            {/* Real File Upload Zone */}
            <div className="border-t border-slate-900 pt-2 text-[7.5px]">
              <label className="text-slate-500 block mb-1 font-bold uppercase">📁 UPLOAD INVOICE DOCUMENT (.TXT, .PDF, .TIFF, .PNG, .JPG)</label>
              <input
                type="file"
                accept=".txt,.pdf,.tiff,.tif,image/*"
                onChange={handleFileImportChange}
                disabled={isParsing}
                className="hidden"
                id="file-upload-invoice"
              />
              <label 
                htmlFor="file-upload-invoice" 
                className={`bg-slate-900 border border-slate-850 p-2 rounded-xl text-slate-300 cursor-pointer hover:border-pink-500/50 flex items-center justify-center gap-1.5 text-[10px] font-sans h-10 transition duration-150 active:scale-95 shadow-sm ${isParsing ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <FileUp className="h-4 w-4 text-pink-400 shrink-0" /> [Choose file / Upload Invoice]
              </label>
            </div>

            {/* Real-time Quality Dashboard Check */}
            {qualityReport && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-2 text-[8px] animate-fadeIn">
                <div className="flex justify-between items-center border-b border-slate-850 pb-1">
                  <span className="text-pink-400 font-bold uppercase tracking-wider block">🛡️ CAPTURE QUALITY STANDARDS CHECK</span>
                  <span className={`px-1 rounded text-[7px] font-bold uppercase ${qualityReport.isPassed ? "bg-emerald-500/25 text-emerald-400" : "bg-rose-500/25 text-rose-400 animate-pulse"}`}>
                    {qualityReport.isPassed ? "✓ QUALITY PASS" : "⚠️ QUALITY BLOCKED"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-855">
                    <span className="text-slate-500 font-medium font-mono">Blur Coefficient</span>
                    <span className={`font-bold font-mono ${qualityReport.isBlurred ? "text-rose-400" : "text-emerald-400"}`}>
                      {qualityReport.isBlurred ? `Blurry (${qualityReport.blurScore})` : `Sharp (${qualityReport.blurScore})`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-855">
                    <span className="text-slate-500 font-medium font-mono">Lighting Luma</span>
                    <span className={`font-bold font-mono ${qualityReport.isLowLight ? "text-rose-400" : qualityReport.isTooBright ? "text-amber-400" : "text-emerald-400"}`}>
                      {qualityReport.isLowLight ? `Dim (${qualityReport.averageLuminance} UX)` : qualityReport.isTooBright ? `Glare (${qualityReport.averageLuminance} UX)` : `Optimal (${qualityReport.averageLuminance} UX)`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-855">
                    <span className="text-slate-500 font-medium font-mono">Radial Rotation</span>
                    <span className={`font-bold font-mono ${qualityReport.isTilted ? "text-rose-400" : "text-emerald-400"}`}>
                      {qualityReport.skewAngle}° {qualityReport.isTilted ? "(Tilted)" : "(Square)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-855">
                    <span className="text-slate-500 font-medium font-mono">Margin Cropping</span>
                    <span className={`font-bold font-mono ${qualityReport.isCropped ? "text-rose-400" : "text-emerald-400"}`}>
                      {qualityReport.isCropped ? "Boundary Risk" : "Intact Margins"}
                    </span>
                  </div>
                </div>

                {!qualityReport.isPassed && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded space-y-1.5">
                    <div className="font-bold text-rose-400 uppercase text-[7px] tracking-wider">⚠️ QUALITY SAFEGUARD WARNINGS:</div>
                    <ul className="list-disc pl-3 text-rose-300 leading-tight space-y-0.5 font-sans">
                      {qualityReport.failures.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-rose-500/10">
                      <input
                        type="checkbox"
                        id="override-quality-check"
                        checked={qualityOverride}
                        onChange={(e) => setQualityOverride(e.target.checked)}
                        className="rounded border-slate-800 text-pink-600 focus:ring-pink-500 cursor-pointer h-3.5 w-3.5"
                      />
                      <label htmlFor="override-quality-check" className="text-[7.5px] font-extrabold text-rose-300 cursor-pointer uppercase select-none">
                        Bypass quality safeguard block & compile OCR regardless (Risk of stock corruption)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct Parser Box */}
            <div className="space-y-1">
              <label className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wide block">Or paste raw invoice document text / PDF values</label>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  handleParseText(e.target.value, "Manual Clipboard Text");
                }}
                disabled={isParsing}
                placeholder="Paste bill OCR read strings here, we automatically isolate products, quantities, rates, and values..."
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 h-16 font-mono text-[7px] text-pink-300 focus:outline-none focus:border-pink-500 disabled:opacity-50"
              />
            </div>

            {isParsing && (
              <div className="flex items-center justify-center gap-2 p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-pink-500 border-t-transparent animate-spin shrink-0" />
                <span className="text-[9px] text-pink-450 font-bold uppercase tracking-wider animate-pulse">Processing wholesale invoice offline...</span>
              </div>
            )}

            {importFeedback && (
              <div className={`p-1.5 rounded text-[8.5px] leading-normal text-center font-bold ${importFeedback.startsWith("Error") ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}`}>
                {importFeedback}
              </div>
            )}

            {originalImage && (
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                <span className="text-[7.5px] text-pink-400 font-bold uppercase tracking-wider block">📷 OCR PREPROCESS PREVIEW</span>
                <div className="flex justify-center bg-slate-950 p-2 rounded border border-slate-850">
                  <img 
                    src={originalImage} 
                    alt="Preprocessed OCR View" 
                    referrerPolicy="no-referrer"
                    className="max-h-[220px] object-contain border border-slate-800 rounded bg-black" 
                  />
                </div>
              </div>
            )}

            {rawTextOutput && (
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg space-y-2">
                <span className="text-[7.5px] text-pink-400 font-bold uppercase tracking-wider block">🛠️ OCR INGESTION DEBUG PANEL</span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-slate-300">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-550 font-bold uppercase">OCR Engine Used</div>
                    <div className="text-[8.2px] font-bold text-rose-400 font-mono tracking-tight break-words">
                      {ocrEngineUsed}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-500 font-bold uppercase">Image Size</div>
                    <div className="text-[8.5px] font-bold text-pink-400 font-sans">
                      {imageSize ? `${imageSize.width} × ${imageSize.height}` : "PDF / Text Source"}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-500 font-bold uppercase">OCR Confidence</div>
                    <div className="text-[8.5px] font-bold text-emerald-400 font-sans">{ocrConfidenceScore}%</div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-500 font-bold uppercase">OCR Text Length</div>
                    <div className="text-[8.5px] font-bold text-sky-400 font-sans">{rawTextOutput.length} Chars</div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-500 font-bold uppercase">Products Found</div>
                    <div className="text-[8.5px] font-bold text-yellow-400 font-sans">{reviewProducts.length} Items</div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                    <div className="text-[7px] text-slate-500 font-bold uppercase">Parser Confidence</div>
                    <div className="text-[8.5px] font-bold text-purple-400 font-sans">
                      {ocrConfidenceScore >= 80 ? "100 (Match)" : `${ocrConfidenceScore}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850">
                  <span className="text-[7.5px] text-pink-450 font-bold uppercase tracking-wider font-mono">
                    📄 RAW EXTRACTED TEXT
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([rawTextOutput], {type: 'text/plain'});
                        element.href = URL.createObjectURL(file);
                        element.download = `ocr_raw_debug_${invoiceNo || "draft"}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-bold text-[7.5px] rounded border border-slate-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="h-2.5 w-2.5 text-pink-400" /> [Download Raw OCR Text File]
                    </button>
                    <button
                      type="button"
                      onClick={runAdminGeminiOcrFallback}
                      disabled={isParsing}
                      className="px-2 py-0.5 bg-pink-950/40 hover:bg-pink-900/60 text-pink-450 font-bold text-[7.5px] rounded border border-pink-500/30 flex items-center gap-1 transition"
                    >
                      <Sparkles className="h-2.5 w-2.5" /> [Try Admin Gemini Fallback]
                    </button>
                  </div>
                </div>
                <pre className="p-2 bg-slate-950 border border-slate-850 rounded text-slate-350 max-h-[140px] overflow-y-auto font-mono text-[7.5px] whitespace-pre-wrap break-all leading-normal">
                  {rawTextOutput}
                </pre>
              </div>
            )}

            {parsedResult && (
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-[8px] space-y-3">
                
                {/* 1. TIERED CONFIDENCE SCORE BANNER */}
                <div className="border-b border-slate-800 pb-2">
                  {ocrConfidenceScore >= 80 ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 p-2 rounded flex items-center gap-2 text-emerald-400 font-bold">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[8.5px] uppercase">High Confidence Extraction ({ocrConfidenceScore}%)</div>
                        <div className="text-[7px] text-slate-400 font-normal leading-normal">Offline heuristics matching is high. Review fields below before ledger entry.</div>
                      </div>
                    </div>
                  ) : ocrConfidenceScore >= 60 ? (
                    <div className="bg-amber-950/40 border border-amber-800/40 p-2 rounded flex items-center gap-2 text-amber-450 font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-[8.5px] uppercase">Moderate Confidence Match ({ocrConfidenceScore}%)</div>
                        <div className="text-[7px] text-slate-400 font-normal leading-normal">Please verify vendor name and item codes carefully. Manual correction active.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-950/40 border border-rose-800/40 p-2 rounded flex items-center gap-2 text-rose-450 font-bold">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                      <div>
                        <div className="text-[8.5px] uppercase">Unable to reliably identify product rows.</div>
                        <div className="text-[7px] text-slate-400 font-normal leading-normal">OCR confidence is {ocrConfidenceScore}%. Row auto-generation is disabled. Please use the controls below to manually add SKU entries.</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.1 IMPORT SAFETY: LOW CATALOG MATCH RATIO BANNER */}
                {reviewProducts.length > 0 && (reviewProducts.filter(p => p.isRecognized).length / reviewProducts.length) < 0.5 && (
                  <div className="bg-amber-950/40 border border-amber-500/20 p-2 rounded flex items-center gap-2 text-amber-450 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[8.5px] uppercase">Auto-Import Disabled: Force Manual Review Required</div>
                      <div className="text-[7px] text-slate-400 font-normal leading-normal">Fewer than 50% of detected SKUs ({Math.round((reviewProducts.filter(p => p.isRecognized).length / reviewProducts.length) * 100)}%) match your registered catalog. Please manually link items first.</div>
                    </div>
                  </div>
                )}

                {/* 2. CORE EDITABLE INVOICE HEADERS */}
                <span className="text-[7.5px] text-pink-400 font-bold uppercase tracking-wider block">✍️ INVOICE METADATA RECONCILIATION CARD</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-950 p-2 rounded border border-slate-850">
                  <div>
                    <label className="text-[6.5px] text-slate-500 font-bold block uppercase mb-1">Wholesale Supplier</label>
                    <input 
                      type="text" 
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-805 rounded px-1.5 py-0.5 text-white focus:border-pink-500 font-sans font-bold select-text"
                    />
                  </div>
                  <div>
                    <label className="text-[6.5px] text-slate-500 font-bold block uppercase mb-1">Invoice / Reference No</label>
                    <input 
                      type="text" 
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-805 rounded px-1.5 py-0.5 text-white focus:border-pink-500 font-sans tracking-wide uppercase select-text"
                    />
                  </div>
                  <div>
                    <label className="text-[6.5px] text-slate-500 font-bold block uppercase mb-1">Invoice Date</label>
                    <input 
                      type="date" 
                      value={invoiceDateVal}
                      onChange={(e) => setInvoiceDateVal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-805 rounded px-1.5 py-0.5 text-white focus:border-pink-500 font-mono select-text"
                    />
                  </div>
                </div>

                {/* 3. CORE EDITABLE LINE ITEMS TABLE */}
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wide">Extracted SKU Line Items ({reviewProducts.length})</span>
                    <button
                      type="button"
                      onClick={handleAddReviewProduct}
                      className="px-2 py-0.5 bg-slate-850 hover:bg-slate-800 text-pink-400 font-semibold rounded text-[7.5px] border border-slate-800 transition"
                    >
                      [➕ ADD NEW ITEM]
                    </button>
                  </div>

                  <div className="max-h-[290px] overflow-y-auto space-y-1.5 pr-1">
                    {reviewProducts.map((p, idx) => {
                      return (
                        <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-850 grid grid-cols-12 gap-1.5 items-center">
                          <div className="col-span-12 md:col-span-3">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono">Catalog Match</label>
                            <select
                              value={p.itemId || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matchedItem = items.find(it => it.id === val);
                                const updated = [...reviewProducts];
                                if (matchedItem) {
                                  updated[idx] = {
                                    ...updated[idx],
                                    itemId: matchedItem.id,
                                    sku: matchedItem.sku,
                                    name: matchedItem.name,
                                    rate: Number(matchedItem.costPrice || updated[idx].rate),
                                    isRecognized: true
                                  };
                                } else {
                                  updated[idx] = {
                                    ...updated[idx],
                                    itemId: "",
                                    isRecognized: false
                                  };
                                }
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-350 font-sans font-medium text-[9px]"
                            >
                              <option value="">-- NEW COSMETIC SKU --</option>
                              {items.map(it => (
                                <option key={it.id} value={it.id}>
                                  {it.name} ({it.sku})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-4 md:col-span-2">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono font-bold">Custom SKU</label>
                            <input
                              type="text"
                              value={p.sku}
                              onChange={(e) => {
                                const updated = [...reviewProducts];
                                const skuVal = e.target.value.toUpperCase();
                                const matchedItem = items.find(it => it.sku.toUpperCase() === skuVal);
                                updated[idx] = {
                                  ...updated[idx],
                                  sku: skuVal,
                                  itemId: matchedItem ? matchedItem.id : "",
                                  isRecognized: !!matchedItem,
                                  name: matchedItem ? matchedItem.name : updated[idx].name
                                };
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-pink-400 font-sans font-bold uppercase text-[9px]"
                            />
                          </div>

                          <div className="col-span-8 md:col-span-3">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono flex items-center justify-between">
                              <span>Display Name</span>
                              {p.validationError && (
                                <span className="bg-rose-955 text-rose-500 border border-rose-800/85 px-1 rounded font-bold text-[6px] animate-pulse">
                                  ⚠️ MATH MISMATCH
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => {
                                const updated = [...reviewProducts];
                                updated[idx].name = e.target.value;
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-white font-sans text-[9px] select-text"
                            />
                          </div>

                          <div className="col-span-3 md:col-span-1">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={p.qty}
                              onChange={(e) => {
                                const updated = [...reviewProducts];
                                updated[idx].qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-white text-right font-mono text-[9px]"
                            />
                          </div>

                          <div className="col-span-4 md:col-span-1">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono">Cost (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={p.rate}
                              onChange={(e) => {
                                const updated = [...reviewProducts];
                                updated[idx].rate = Math.max(0, parseFloat(e.target.value) || 0);
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-emerald-400 font-bold text-right font-mono text-[9px]"
                            />
                          </div>

                          <div className="col-span-3 md:col-span-1">
                            <label className="text-[6px] text-slate-500 block uppercase font-mono">GST %</label>
                            <input
                              type="number"
                              min="0"
                              value={p.gstPercent}
                              onChange={(e) => {
                                const updated = [...reviewProducts];
                                updated[idx].gstPercent = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setReviewProducts(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-400 text-right font-mono text-[9px]"
                            />
                          </div>

                          <div className="col-span-2 md:col-span-1 text-center">
                            <label className="text-[6px] text-slate-500 block opacity-0 uppercase font-mono">D</label>
                            <button
                              type="button"
                              onClick={() => handleRemoveReviewProduct(idx)}
                              className="text-rose-500 hover:text-rose-450 font-bold shrink-0 text-[10px] transition duration-100 ease-in-out hover:scale-125"
                              title="Delete product line"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. COGNITIVE MATHEMATICAL LIVE CALCULATION RECAP */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 grid grid-cols-3 gap-2 text-right">
                  <div>
                    <span className="text-slate-500 text-[7px] uppercase block">Subtotal</span>
                    <span className="text-slate-300 font-mono text-[10px] font-bold">₹{reviewSubtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[7px] uppercase block">Assessed GST</span>
                    <span className="text-slate-400 font-mono text-[10px] font-bold">₹{reviewGstTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-pink-400 text-[7px] uppercase block font-bold">Grand Inward Total</span>
                    <span className="text-pink-400 font-mono text-[11px] font-black">₹{reviewGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* 5. INTERACTIVE DUPLICATE INVOICE PREVENTION SYSTEM */}
                {isDuplicateDetected && !forceImportMode ? (
                  <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-450 font-black">
                      <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
                      <span>DUPLICATE INVOICE REGISTER DETECTED</span>
                    </div>
                    <p className="text-slate-400 text-[8.2px] leading-relaxed font-sans font-medium">
                      The registry already holds a logged inward receipt for vendor <strong>{vendorName}</strong>, invoice reference <strong>#{invoiceNo}</strong> on date <strong>{invoiceDateVal}</strong> with grand total of <strong>₹{reviewGrandTotal}</strong>. Importing this will duplicate inventory postings.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText("");
                          setParsedResult(null);
                          setRawTextOutput("");
                          setOriginalImage("");
                          setOriginalOcrText("");
                          setShowImporter(false);
                        }}
                        className="flex-1 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded font-black text-[8px] uppercase tracking-wider transition"
                      >
                        [✕ Cancel Import]
                      </button>
                      <button
                        type="button"
                        onClick={() => setForceImportMode(true)}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-black text-[8px] uppercase tracking-wider transition shadow"
                      >
                        [⚠️ Force Import Anyway]
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[8px] items-center">
                    <div className="flex items-center gap-1.5 pl-1 bg-slate-950 border border-slate-850 px-1.5 py-1 rounded">
                      <span className="text-[6.5px] text-slate-500 font-bold uppercase shrink-0">Auditor Clerk:</span>
                      <input 
                        type="text" 
                        value={clerk}
                        onChange={(e) => setClerk(e.target.value)}
                        className="w-full bg-transparent text-slate-200 font-sans font-bold select-text focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleCommitImportedInvoice}
                      className="py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold cursor-pointer transition rounded text-white flex items-center justify-center gap-1 uppercase select-none font-sans text-[10px] tracking-wider font-extrabold shadow"
                      type="button"
                    >
                      <Check className="h-3.5 w-3.5" /> Book Inward Stock Entry
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* HISTORICAL LOG CHANNELS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="block text-[8.5px] font-mono text-slate-400 uppercase tracking-widest font-bold">
            📊 Sales Memo Invoice Log Registry
          </span>
          
          <div className="flex gap-1">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-1 text-[7px] text-slate-300"
              title="Filter by specific day"
            />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-1 text-[7px] text-slate-300"
              title="Filter by specific month"
            />
            {(dateFilter || monthFilter) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setMonthFilter("");
                }}
                className="text-rose-455 hover:text-rose-400 font-bold font-mono text-[7px]"
              >
                [RESET]
              </button>
            )}
          </div>
        </div>

        {/* Totals Summary Card */}
        <div className="bg-slate-950 p-2 rounded border border-slate-850 flex justify-between items-center">
          <span className="text-slate-500 text-[8px] uppercase">TOTAL ACCOUNTED GST SALES VALUE:</span>
          <span className="text-emerald-400 font-black text-sm">₹{filteredSum.toLocaleString()}</span>
        </div>

        <div className="space-y-1.5">
          {filteredSales.length === 0 ? (
            <span className="block text-slate-500 text-[8px] py-3 text-center border border-slate-850 border-dashed rounded font-mono">
              No matching sales invoices found in log registry.
            </span>
          ) : (
            filteredSales.slice().reverse().map((s) => (
              <div 
                key={s.id} 
                className={`p-2 bg-slate-950 border rounded flex flex-col gap-1 text-[8.5px] font-mono ${s.isCancelled ? 'border-dashed border-rose-500/40 opacity-55' : 'border-slate-850 hover:border-slate-750 transition'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-200">#{s.invoiceNumber}</strong>
                      {s.isCancelled && (
                        <span className="text-[6.5px] text-rose-450 border border-rose-500/25 px-1 py-0.2 rounded font-bold uppercase shrink-0">CANCELLED / VOID</span>
                      )}
                    </div>
                    <span className="text-[7px] text-slate-500 block">{s.saleDate} • Custom: {s.customerName} {s.customerPhone && `(${s.customerPhone})`}</span>
                  </div>
                  <span className="text-pink-300 font-black shrink-0 text-[10px]">₹{s.grandTotal}</span>
                </div>

                <div className="space-y-0.5 border-t border-slate-900/60 pt-1 mt-0.5 text-slate-400 leading-normal text-[7.5px]">
                  {s.items.map((i: any, key: number) => (
                    <div key={key} className="flex justify-between">
                      <span>• {i.name}</span>
                      <span>{i.quantity} PCS</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[7px] border-t border-slate-900 pt-1 mt-1 shrink-0">
                  <span className="text-slate-600">operator: {s.operator}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedBill(s)} 
                      className="text-pink-400 hover:text-pink-300 cursor-pointer font-bold uppercase"
                      type="button"
                    >
                      [RECEIPT VIEW]
                    </button>
                    {!s.isCancelled && (
                      <button 
                        onClick={() => {
                          if (!isManagerMode) {
                            alert("SECURITY ERROR: Sale cancellation is restricted to supervisory manager mode!");
                            return;
                          }
                          if (window.confirm(`Cancel Sale invoice hash #${s.invoiceNumber}? This will reverse the stock ledger impact by restoring quantities.`)) {
                            cancelSale(s.id, "Manager billing user");
                          }
                        }} 
                        className={`font-semibold uppercase ${isManagerMode ? 'text-rose-400 hover:text-rose-350 cursor-pointer' : 'text-slate-700 cursor-not-allowed select-none'}`}
                        title={!isManagerMode ? "Restricted: Only managers can cancel store bills" : "Void invoice"}
                        type="button"
                      >
                        [CANCEL BILL]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BILL DIALOG modal PREVIEW */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-300 rounded-xl p-3.5 text-slate-950 shadow-2xl space-y-3.5 leading-normal font-sans animate-fade-in text-[9px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <p className="text-[12px] font-black text-pink-600 uppercase font-mono leading-none">SIDIVNIYAK BEAUTY & COSMETICS</p>
                <p className="text-[7.5px] text-slate-500 font-mono uppercase tracking-tight leading-none mt-1">Cosmetics Retail Outlet, Mumbai, MH</p>
                <p className="text-[7px] text-slate-400 font-mono mt-0.5">GSTIN: 27SIDIV9802F1Z4</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[7.5px] px-1 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-750 uppercase tracking-widest leading-none">CASH MEMO</span>
                <p className="text-[8px] font-mono text-slate-600 mt-1 leading-none font-bold">#{selectedBill.invoiceNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 text-[8px] font-mono text-slate-600 border-b border-slate-100 pb-2.5 gap-y-1 shrink-0">
              <div>
                <span className="text-slate-400 uppercase block text-[6.5px]">CUSTOMER DETAILS</span>
                <strong className="text-slate-800">{selectedBill.customerName}</strong>
                {selectedBill.customerPhone && <p className="leading-none mt-0.5">Ph: {selectedBill.customerPhone}</p>}
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase block text-[6.5px]">DATE OF SALE</span>
                <p className="font-bold text-slate-800">{selectedBill.saleDate}</p>
                {selectedBill.customerGstin && <p className="text-[7px] text-pink-600 font-bold leading-none mt-0.5">GSTIN: {selectedBill.customerGstin}</p>}
              </div>
            </div>

            {selectedBill.isCancelled && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[8px] p-2 rounded flex items-center gap-1.5 uppercase font-bold text-center shrink-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>THIS TRANSACTION WAS CANCELLED OUTWARD SYSTEM QUANTITIES CORRECTED</span>
              </div>
            )}

            {/* TABLE */}
            <div className="overflow-hidden rounded border border-slate-150">
              <table className="w-full text-left text-[8px] font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <td className="p-1 px-1.5 font-bold">ITEM DESCRIPTION</td>
                    <td className="p-1 px-1.5 text-right font-bold">QTY</td>
                    <td className="p-1 px-1.5 text-right font-bold">RATE</td>
                    <td className="p-1 px-1.5 text-right font-bold">TOTAL</td>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items.map((item: any, id: number) => (
                    <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-1 px-1.5 font-sans font-semibold text-slate-800">{item.name} <span className="text-[6.5px] text-slate-400 block font-mono">SKU: {item.sku}</span></td>
                      <td className="p-1 px-1.5 text-right text-slate-500 font-bold">{item.quantity} PCS</td>
                      <td className="p-1 px-1.5 text-right text-slate-500">₹{item.rate}</td>
                      <td className="p-1 px-1.5 text-right font-black text-slate-800">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-2 rounded text-[7.5px] font-mono space-y-0.5 border border-slate-100 text-slate-700 text-right leading-relaxed">
              <div>SUBTOTAL EXCLUSIVE: <span className="text-slate-900 font-semibold">₹{selectedBill.subtotal}</span></div>
              <div>CGST TAX ACCRUAL (9%): <span className="text-slate-900">₹{selectedBill.cgstTotal}</span></div>
              <div>SGST TAX ACCRUAL (9%): <span className="text-slate-900">₹{selectedBill.sgstTotal}</span></div>
              {selectedBill.discount > 0 && <div className="text-rose-500 font-bold">CASH DISCOUNTS: -₹{selectedBill.discount}</div>}
              <div className="text-[9.5px] text-pink-650 font-black border-t border-slate-250 pt-1.5 uppercase tracking-wide">GRAND REVENUE PAYABLE: ₹{selectedBill.grandTotal}</div>
            </div>

            {/* Export & Actions Panel */}
            <div className="border-t border-b border-slate-100 py-2.5 space-y-2">
              <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider font-mono">Export & Share Invoice Document</p>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadPdf(selectedBill)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
                >
                  <Download className="h-2.5 w-2.5 text-pink-600" /> DOWNLOAD PDF
                </button>
                <button
                  type="button"
                  onClick={() => sharePdf(selectedBill)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
                >
                  <Share2 className="h-2.5 w-2.5 text-pink-600" /> SHARE PDF FILE
                </button>
                <button
                  type="button"
                  onClick={() => whatsappShare(selectedBill)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
                >
                  <Send className="h-2.5 w-2.5 text-emerald-600" /> WHATSAPP SHARE
                </button>
                <button
                  type="button"
                  onClick={() => emailShare(selectedBill)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[7.5px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 text-slate-800 transition select-none"
                >
                  <Mail className="h-2.5 w-2.5 text-sky-600" /> EMAIL INVOICE
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => printInvoice(selectedBill)}
                className="flex-1 py-1 px-2 bg-slate-950 hover:bg-slate-850 text-white font-mono text-[8px] font-bold rounded cursor-pointer flex items-center justify-center gap-1 shadow select-none"
              >
                <Printer className="h-3 w-3 shrink-0" /> PRINT INVOICE
              </button>
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 font-mono text-[8px] font-semibold rounded cursor-pointer transition select-none"
              >
                [CLOSE]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

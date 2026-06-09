// Mock localStorage for Node.js test environment
if (typeof global !== "undefined" && !(global as any).localStorage) {
  (global as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    clear: () => {},
    removeItem: () => {}
  };
}

import { parseInvoiceTextOffline } from "../src/lib/ocrParser";

const rawInvoiceText = `
KESHAV SALES
Supplier of Premium Cosmetics and Toiletries
Invoice No: KSB-24856
Date: 06-08-2026

=======================================================
Description of Goods             Amount     Unit   Rate    Qty   Unit   HSN
=======================================================
PONDS SUPER GEL 25GM (144*64) 27324.00 PCS 37.95 720 PCS 33049930
DOVE SHMP 200ML (36*205) 35856.00 PCS 124.50 288 PCS 33051090
PONDS DFT 100GM (100*125) 51912.00 PCS 86.52 600 PCS 33049120
PONDSSANDAL TALC 100GM (72*150) 32322.24 PCS 112.23 288 PCS 33049120
LOREAL SHAMPOO 200ML (24*169) 15084.00 PCS 104.75 144 PCS 33051090
=======================================================
Output CGST 9%
Output SGST 9%
=======================================================
Total Amount: 191748.00
`;

const mockRegisteredItems = [
  { id: "1", sku: "PONDS-SUPER-GEL-25GM", name: "PONDS SUPER GEL 25GM", costPrice: 37.95 },
  { id: "2", sku: "DOVE-SHMP-200ML", name: "DOVE SHMP 200ML", costPrice: 124.50 },
  { id: "3", sku: "PONDS-DFT-100GM", name: "PONDS DFT 100GM", costPrice: 86.52 },
  { id: "4", sku: "PONDSSANDAL-TALC-100GM", name: "PONDSSANDAL TALC 100GM", costPrice: 112.23 },
  { id: "5", sku: "LOREAL-SHAMPOO-200ML", name: "LOREAL SHAMPOO 200ML", costPrice: 104.75 }
];

function runTests() {
  console.log("=== RUNNING EMERGENCY PARSER UNIT TESTS ===");
  const parsed = parseInvoiceTextOffline(rawInvoiceText, mockRegisteredItems);

  console.log("\n--- Parsed Document Metadata ---");
  console.log(`Vendor: ${parsed.vendor}`);
  console.log(`Invoice Number: ${parsed.invoiceNumber}`);
  console.log(`Invoice Date: ${parsed.invoiceDate}`);
  console.log(`Rejected: ${parsed.rejected ? "YES" : "NO"}`);
  console.log(`Rejection Reasons: ${parsed.rejectionReasons?.join(", ") || "None"}`);
  console.log(`Confidence Score: ${parsed.confidence}%`);

  console.log("\n--- Parsed Products ---");
  let passCount = 0;
  
  if (parsed.products.length !== 5) {
    console.error(`❌ Failure: Expected 5 products, but found ${parsed.products.length}`);
  } else {
    console.log("✓ Success: Extracted exactly 5 products.");
    passCount++;
  }

  const expectedProducts = [
    { name: "PONDS SUPER GEL 25GM (144*64)", qty: 720, rate: 37.95, amount: 27324.00 },
    { name: "DOVE SHMP 200ML (36*205)", qty: 288, rate: 124.50, amount: 35856.00 },
    { name: "PONDS DFT 100GM (100*125)", qty: 600, rate: 86.52, amount: 51912.00 },
    { name: "PONDSSANDAL TALC 100GM (72*150)", qty: 288, rate: 112.23, amount: 32322.24 },
    { name: "LOREAL SHAMPOO 200ML (24*169)", qty: 144, rate: 104.75, amount: 15084.00 }
  ];

  parsed.products.forEach((p, idx) => {
    const exp = expectedProducts[idx];
    if (!exp) {
      console.error(`❌ Failure: Unexpected product at index ${idx}`);
      return;
    }
    const isNameMatch = p.name.includes(exp.name.trim().substring(0, 15));
    const isQtyMatch = p.qty === exp.qty;
    const isRateMatch = Math.abs(p.rate - exp.rate) < 0.01;
    const isAmountMatch = Math.abs((p.amount || 0) - exp.amount) < 0.01;

    if (isQtyMatch && isRateMatch && isAmountMatch) {
      console.log(`✓ Product [${idx + 1}] (${p.name}): Qty=${p.qty}, Rate=${p.rate}, Amount=${p.amount} matched expected values perfectly.`);
      passCount++;
    } else {
      console.error(`❌ Failure with Product [${idx + 1}]:`);
      console.error(`  Expected: Name contains "${exp.name}", Qty=${exp.qty}, Rate=${exp.rate}, Amount=${exp.amount}`);
      console.error(`  Received: Name="${p.name}", Qty=${p.qty}, Rate=${p.rate}, Amount=${p.amount}`);
    }
  });

  console.log("\n--- Financial Validation ---");
  console.log(`Calculated Subtotal: ${parsed.subtotal}`);
  console.log(`Calculated GST (18%): ${parsed.gstAmount}`);
  console.log(`Calculated Grand Total: ${parsed.grandTotal}`);

  const expectedSubtotal = 162498.24;
  const expectedGst = 29249.68;
  const expectedGrandTotal = 191748.00;

  const isSubtotalOk = Math.abs(parsed.subtotal - expectedSubtotal) < 0.02;
  const isGstOk = Math.abs(parsed.gstAmount - expectedGst) < 0.02;
  const isGrandTotalOk = Math.abs(parsed.grandTotal - expectedGrandTotal) < 0.02;

  if (isSubtotalOk) {
    console.log("✓ Success: Subtotal matched 162498.24");
    passCount++;
  } else {
    console.error(`❌ Failure: Subtotal mismatch! Expected ${expectedSubtotal}, received ${parsed.subtotal}`);
  }

  if (isGstOk) {
    console.log("✓ Success: GST matched 29249.68");
    passCount++;
  } else {
    console.error(`❌ Failure: GST mismatch! Expected ${expectedGst}, received ${parsed.gstAmount}`);
  }

  if (isGrandTotalOk) {
    console.log("✓ Success: Grand Total matched 191748.00");
    passCount++;
  } else {
    console.error(`❌ Failure: Grand Total mismatch! Expected ${expectedGrandTotal}, received ${parsed.grandTotal}`);
  }

  if (passCount === 9) {
    console.log("\n✅ ALL 9 CONVERSIONS AND MATHEMATICAL TESTS PASSED SUCCESSFULLY! The offline parser is extremely resilient.");
    process.exit(0);
  } else {
    console.error(`\n❌ SOME TESTS FAILED! Total passing assertions: ${passCount}/9`);
    process.exit(1);
  }
}

runTests();

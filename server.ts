/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-Stack Express Server with Vite integration and server-side Gemini API.
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser middleware with large payload limit for PDF/Image base64 transmission
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Server-side lazy-initialized Gemini SDK client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required and must be configured.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// REST API Endpoints

/**
 * Endpoint for parsing PDFs, images, and raw invoice text with Gemini AI.
 */
app.post("/api/ocr/parse", async (req, res) => {
  try {
    const { fileBase64, mimeType, text, items } = req.body;

    if (!fileBase64 && !text) {
      res.status(400).json({ error: "Missing file base64 content or text." });
      return;
    }

    const ai = getAiClient();

    const promptInstructions = `
Analyze the uploaded document, which is a supplier wholesale invoice. Text or file content has been uploaded.
You must extract the supplier name, invoice reference/number, invoice date, ALL products with their quantities, rate prices, and GST.
Also, perform a full text reconstruction of the entire invoice and place it in the 'rawText' field.

We are matching items to our current database of registered cosmetics items. Here is the list of products currently registered in our system:
${JSON.stringify(items || [])}

Rules for parsing and matching:
1. Extract 'vendor' (Supplier Name), 'invoiceNumber', and 'invoiceDate' (Format: YYYY-MM-DD or parse date accurately, e.g. "6th June 2026" should be "2026-06-06").
2. Extract EVERY single product row, including SKU, raw description name, quantity, rate cost price, and GST percent (Indian standard is 18%). NEVER skip items or stop after the first item.
3. For matching against our database items:
   - Identify if the invoice item matches any item in the provided system list by its SKU (case-insensitive exact or substring) or by its product name.
   - If there is a highly confident match (confidence >= 90%), return 'matchedProductId' with the system item's ID, change 'isNewProduct' to false, and set 'confidence' to the score (between 90 and 100).
   - If you cannot match the item with >= 90% confidence, or if it is a new/previously unseen cosmetics product:
     - Set 'matchedProductId' to null.
     - Set 'isNewProduct' to true.
     - Extract its proper SKU and Name carefully (do not guess or associate it with existing different brands. e.g. PONDS must not match DOVE).
     - Set 'confidence' to a value below 90 (e.g., 50 or 0).
4. Do NOT replace or substitute real merchant names or product names with sample names or demo products. Preserve the exact product descriptions read from the document.
5. If you encounter completely unreadable rows, garbage text, or if confidence of extracting the item itself is extremely low, return:
   - 'name': "Unknown Product - Please Select Manually"
   - 'sku': "UNKNOWN"
   - 'confidence': 10
   - 'matchedProductId': null
   - 'isNewProduct': false

Return the output strictly in the following JSON structure:
{
  "rawText": "Provide a complete text block/reconstruction of all raw text read or identified from the invoice, specifically listing every line item detail exactly as printed in the original file.",
  "vendor": "Extracted supplier name",
  "invoiceNumber": "Extracted invoice number",
  "invoiceDate": "YYYY-MM-DD",
  "products": [
    {
      "sku": "Extracted SKU/Code",
      "name": "Standard product display name (raw or descriptive)",
      "qty": 10,  // Integer quantity
      "rate": 150.0, // Float cost price
      "gstPercent": 18, // GST percent rate (typically 18, 12, etc.)
      "confidence": 95, // Confidence percentage (0-100)
      "matchedProductId": "itemID_from_db_or_null",
      "isNewProduct": true_or_false
    }
  ],
  "subtotal": 1500.0,
  "gstAmount": 270.0,
  "grandTotal": 1770.0
}
`;

    let contentPayload: any[] = [];

    if (fileBase64 && mimeType) {
      // Strip any base64 metadata headers
      let cleanBase64 = fileBase64;
      if (fileBase64.includes(";base64,")) {
        cleanBase64 = fileBase64.split(";base64,").pop() || "";
      }

      contentPayload.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType
        }
      });
    }

    if (text) {
      contentPayload.push({
        text: `Raw text fallback context:\n${text}`
      });
    }

    contentPayload.push({ text: promptInstructions });

    // Call Gemini API server-side
    const geminiResponse = await ai.models.generateContent({
     model: "gemini-2.0-flash",
      contents: contentPayload,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedTextResult = geminiResponse.text;
    if (!parsedTextResult) {
      res.status(500).json({ error: "Failed to extract text prediction from Gemini model." });
      return;
    }

    // Clean text and parse as JSON
    const cleanJsonText = parsedTextResult.trim();
    const resultObj = JSON.parse(cleanJsonText);

    res.json(resultObj);

  } catch (error: any) {
    console.error("Gemini OCR Integration Exception: ", error);
    res.status(500).json({ 
      error: error.message || "An exception occurred during invoice OCR processing." 
    });
  }
});

// Serve frontend assets with Vite in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIDIVNIYAK] Server running on http://localhost:${PORT}`);
  });
}

startServer();

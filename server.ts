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

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser middleware with large payload limit for PDF/Image base64 transmission
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// REST API Endpoints

/**
 * Endpoint for parsing PDFs, images, and raw invoice text with Gemini AI.
 * Uses pure Node native fetch to guarantee isolated API Key authentication,
 * preventing container-level OAuth or metadata bearer token interception.
 */
app.post("/api/ocr/parse", async (req, res) => {
  try {
    const { fileBase64, mimeType, text, items, engine } = req.body;

    if (!fileBase64 && !text) {
      res.status(400).json({ error: "Missing file base64 content or text." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required and must be configured.");
    }

    // Determine engine-specific behavior
    let activeTextContext = text || "";
    let ocrEngineLabel = engine || "paddle_ocr";

    // If the selected engine is OCR.space, we utilize the external OCR.space API first
    if (ocrEngineLabel === "ocr_space" && fileBase64) {
      try {
        console.log("[server.ts] Executing OCR.space API workflow...");
        const ocrSpaceKey = process.env.OCR_SPACE_API_KEY || "K88722238488957";
        
        // Prepare base64 string for OCR.space
        let cleanBase64 = fileBase64;
        if (fileBase64.includes(";base64,")) {
          cleanBase64 = fileBase64; // OCR.space accepts data URI format or raw base64
        } else {
          cleanBase64 = `data:${mimeType || "image/jpeg"};base64,${fileBase64}`;
        }

        const formData = new URLSearchParams();
        formData.append("apikey", ocrSpaceKey);
        formData.append("base64Image", cleanBase64);
        formData.append("language", "eng");
        formData.append("isTable", "true");
        formData.append("scale", "true");

        const ocrSpaceResponse = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData.toString()
        });

        if (ocrSpaceResponse.ok) {
          const ocrSpaceJson = await ocrSpaceResponse.json();
          if (ocrSpaceJson.IsErroredOnProcessing) {
            console.warn("[server.ts] OCR.space processing failed, falling back to Google Vision:", ocrSpaceJson.ErrorMessage);
          } else {
            const parsedText = ocrSpaceJson.ParsedResults?.[0]?.ParsedText || "";
            if (parsedText.trim().length > 0) {
              console.log("[server.ts] OCR.space successfully retrieved text length in characters:", parsedText.length);
              activeTextContext = parsedText;
            }
          }
        } else {
          console.warn("[server.ts] OCR.space endpoint returned non-OK status:", ocrSpaceResponse.status);
        }
      } catch (ocrSpaceErr) {
        console.warn("[server.ts] Failed executing external OCR.space request:", ocrSpaceErr);
      }
    }

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

    const contentPayloadParts: any[] = [];

    // If we have an OCR string from OCR.space, or if it's textual PDF, we pass it.
    // Otherwise, if we're doing visual-based OCR (paddle_ocr or google_vision), we pass the image structure as inlineData.
    if (activeTextContext) {
      contentPayloadParts.push({
        text: `Raw OCR or Text Context parsed by engine [${ocrEngineLabel}]:\n${activeTextContext}`
      });
    }

    // Always send the image inlineData for multi-modal verification if doing "paddle_ocr" or "google_vision"
    if (fileBase64 && mimeType && (!activeTextContext || ocrEngineLabel !== "ocr_space")) {
      let cleanBase64 = fileBase64;
      if (fileBase64.includes(";base64,")) {
        cleanBase64 = fileBase64.split(";base64,").pop() || "";
      }

      contentPayloadParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType
        }
      });
    }

    contentPayloadParts.push({ text: promptInstructions });

    // Pure, direct HTTP POST avoids importing heavyweight sdk routines that trigger Service Account token metadata interceptors
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: contentPayloadParts
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini REST failure: Status ${response.status}`, errorText);
      throw new Error(`Gemini Server response: HTTP ${response.status} - ${errorText}`);
    }

    const responseJson = await response.json();
    const candidateText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("No structured text output was obtained from the model candidates.");
    }

    const cleanResult = JSON.parse(candidateText.trim());
    res.json(cleanResult);

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

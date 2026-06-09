/**
 * Offline Supplier Format Learning System
 * Stores learned mapping patterns in localStorage to improve OCR accuracy and map future bills automatically.
 */

export interface LearntSupplierTemplate {
  vendorName: string;
  // Maps a raw text/product line description to a system SKU
  productMapping: { [rawDescription: string]: string };
  // Keeps track of common metadata like usual GST or invoice-number patterns
  invoicePatterns?: {
    gstPercent?: number;
    digitsOnlyInvNum?: boolean;
  };
}

const STORAGE_KEY = "sidivniyak_supplier_templates_v2";

export function loadAllSupplierTemplates(): LearntSupplierTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load supplier templates:", err);
    return [];
  }
}

export function saveAllSupplierTemplates(templates: LearntSupplierTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("Failed to save supplier templates:", err);
  }
}

/**
 * Remember a correction on a supplier invoice.
 * Next time this vendor is matched, we search their description-to-SKU dictionary first!
 */
export function learnSupplierCorrection(vendor: string, rawDescription: string, targetSku: string) {
  if (!vendor || !rawDescription || !targetSku) return;

  const templates = loadAllSupplierTemplates();
  const rawDescUpper = rawDescription.trim().toUpperCase();
  const vendorUpper = vendor.trim().toUpperCase();

  let template = templates.find(t => t.vendorName.toUpperCase() === vendorUpper);

  if (!template) {
    template = {
      vendorName: vendor,
      productMapping: {}
    };
    templates.push(template);
  }

  // Update mapping
  template.productMapping[rawDescUpper] = targetSku.trim().toUpperCase();
  
  saveAllSupplierTemplates(templates);
  console.log(`[Supplier Learning] Mapped raw descriptions: "${rawDescUpper}" -> "${targetSku.toUpperCase()}" for vendor "${vendor}"`);
}

/**
 * Apply known learned templates to any extracted product rows
 */
export function applyLearntMappings(vendor: string, lineText: string): string | null {
  if (!vendor || !lineText) return null;

  const templates = loadAllSupplierTemplates();
  const vendorUpper = vendor.trim().toUpperCase();
  const lineUpper = lineText.trim().toUpperCase();

  const template = templates.find(t => t.vendorName.toUpperCase() === vendorUpper);
  if (!template) return null;

  // Search for direct key matches or substring matches in the learned mapping
  for (const rawDesc of Object.keys(template.productMapping)) {
    if (lineUpper.includes(rawDesc) || rawDesc.includes(lineUpper)) {
      return template.productMapping[rawDesc];
    }
  }

  return null;
}

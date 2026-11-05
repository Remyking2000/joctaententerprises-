import { formatKes } from "./format";

/** The placeholder shipped in `.env.example`; treated as "not configured". */
const PLACEHOLDER_NUMBERS = new Set(["254700000000"]);

export interface WhatsAppOrderItem {
  productSlug: string;
  productName: string;
  sku: string;
  oemPartNumber: string | null;
  variantName?: string;
  priceKes: string;
  quantity: number;
}

/**
 * Normalizes a Kenyan phone number into the international digits-only form
 * that wa.me expects (e.g. "0712 345 678" -> "254712345678").
 * Returns null for anything that is not a plausible Kenyan mobile number,
 * or for the `.env.example` placeholder.
 */
export function normalizeWhatsAppNumber(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[17]/.test(digits)) {
    digits = `254${digits}`;
  }
  if (!/^254[17]\d{8}$/.test(digits)) return null;
  if (PLACEHOLDER_NUMBERS.has(digits)) return null;
  return digits;
}

/** Jocta Enterprises sales desk, used when VITE_WHATSAPP_NUMBER is not set. */
export const DEFAULT_STORE_WHATSAPP_NUMBER = "254723494623";

/**
 * The store's WhatsApp ordering number: VITE_WHATSAPP_NUMBER when it holds a
 * valid number, otherwise the Jocta sales desk default.
 */
export function getStoreWhatsAppNumber(): string | null {
  return (
    normalizeWhatsAppNumber(
      import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined,
    ) ?? DEFAULT_STORE_WHATSAPP_NUMBER
  );
}

/**
 * Builds the plain-text order message a customer sends to the store.
 * `siteOrigin` (e.g. "https://jocta.co.ke") adds a product link per line so
 * staff can open the exact item; omit it to leave links out.
 */
export function buildWhatsAppOrderMessage(
  items: WhatsAppOrderItem[],
  siteOrigin?: string,
): string {
  const origin = siteOrigin?.replace(/\/$/, "");
  let subtotal = 0;

  const lines = items.map((item, index) => {
    const unit = parseFloat(item.priceKes) || 0;
    const lineTotal = unit * item.quantity;
    subtotal += lineTotal;

    const details = [`SKU: ${item.sku}`];
    if (item.oemPartNumber) details.push(`OEM: ${item.oemPartNumber}`);

    const block = [`${index + 1}. ${item.productName}`];
    if (item.variantName) block.push(`   Option: ${item.variantName}`);
    block.push(`   ${details.join(" | ")}`);
    block.push(
      `   Qty ${item.quantity} x ${formatKes(unit)} = ${formatKes(lineTotal)}`,
    );
    if (origin) block.push(`   ${origin}/shop/${item.productSlug}`);
    return block.join("\n");
  });

  return [
    "Hello Jocta Enterprises, I would like to order the following:",
    "",
    lines.join("\n\n"),
    "",
    `Estimated subtotal: ${formatKes(subtotal)}`,
    "",
    "Please confirm availability, final price and delivery. Thank you.",
  ].join("\n");
}

/** Builds a wa.me deep link that opens a chat with the message pre-filled. */
export function buildWhatsAppOrderUrl(
  phoneNumber: string,
  message: string,
): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

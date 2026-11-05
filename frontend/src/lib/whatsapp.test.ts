import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppNumber,
  type WhatsAppOrderItem,
} from "./whatsapp";

const toner: WhatsAppOrderItem = {
  productSlug: "hp-26a-black-toner",
  productName: "HP 26A Black Toner",
  sku: "JT-HP26A",
  oemPartNumber: "CF226A",
  variantName: "Compatible",
  priceKes: "3500",
  quantity: 2,
};

const part: WhatsAppOrderItem = {
  productSlug: "fuser-film-sleeve",
  productName: "Fuser Film Sleeve",
  sku: "JT-FUSER",
  oemPartNumber: null,
  priceKes: "1250.50",
  quantity: 1,
};

describe("normalizeWhatsAppNumber", () => {
  it("converts local and international Kenyan formats", () => {
    expect(normalizeWhatsAppNumber("0712 345 678")).toBe("254712345678");
    expect(normalizeWhatsAppNumber("+254 712-345-678")).toBe("254712345678");
    expect(normalizeWhatsAppNumber("254112345678")).toBe("254112345678");
    expect(normalizeWhatsAppNumber("712345678")).toBe("254712345678");
  });

  it("rejects empty, malformed and placeholder numbers", () => {
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("12345")).toBeNull();
    expect(normalizeWhatsAppNumber("254212345678")).toBeNull();
    expect(normalizeWhatsAppNumber("254700000000")).toBeNull();
  });
});

describe("buildWhatsAppOrderMessage", () => {
  it("lists every item with quantity, line total and subtotal", () => {
    const msg = buildWhatsAppOrderMessage([toner, part]);

    expect(msg).toContain("1. HP 26A Black Toner");
    expect(msg).toContain("Option: Compatible");
    expect(msg).toContain("SKU: JT-HP26A | OEM: CF226A");
    expect(msg).toContain("Qty 2 x KSh 3,500 = KSh 7,000");
    expect(msg).toContain("2. Fuser Film Sleeve");
    expect(msg).toContain("SKU: JT-FUSER\n");
    expect(msg).toContain("Qty 1 x KSh 1,250.50 = KSh 1,250.50");
    expect(msg).toContain("Estimated subtotal: KSh 8,250.50");
    expect(msg).not.toContain("http");
  });

  it("adds product links when a site origin is given", () => {
    const msg = buildWhatsAppOrderMessage([toner], "https://jocta.co.ke/");
    expect(msg).toContain("https://jocta.co.ke/shop/hp-26a-black-toner");
  });
});

describe("buildWhatsAppOrderUrl", () => {
  it("encodes the message into a wa.me link", () => {
    const url = buildWhatsAppOrderUrl("254712345678", "Hi & thanks\nQty 2");
    expect(url).toBe(
      "https://wa.me/254712345678?text=Hi%20%26%20thanks%0AQty%202",
    );
  });
});

import type {
  ProductAuthenticity,
  ProductCondition,
  ProductType,
  VariantAuthenticity,
} from "@jocta/shared";

/**
 * Formats a numeric or string KSh value into a readable Kenyan Shilling label.
 */
export function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "KSh —";
  }
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) {
    return `KSh ${amount}`;
  }
  const hasCents = Math.round(num * 100) % 100 !== 0;
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  toner: "Laser Toner",
  ink: "Ink Supply",
  drum: "Drum Unit",
  printer_part: "Printer Spare Part",
  consumable: "Consumable",
  printer: "Printer",
};

export const PRODUCT_AUTHENTICITY_LABELS: Record<ProductAuthenticity, string> = {
  original: "Original OEM",
  compatible: "Compatible",
  both: "OEM & Compatible",
};

export const VARIANT_AUTHENTICITY_LABELS: Record<VariantAuthenticity, string> = {
  original: "Original OEM",
  compatible: "Compatible",
};

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
};

/**
 * Photographic dummy images per product category.
 */
export const DUMMY_HARDWARE_IMAGES: Record<ProductType, string> = {
  toner:
    "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=700&q=80",
  ink:
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=700&q=80",
  drum:
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=80",
  printer_part:
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80",
  consumable:
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=700&q=80",
  printer:
    "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=700&q=80",
};

export const LOCAL_PRODUCT_PLACEHOLDERS: Record<ProductType, string> = {
  toner: "/images/category-toners.svg",
  ink: "/images/category-ink.svg",
  drum: "/images/placeholder-drum.svg",
  printer_part: "/images/category-parts.svg",
  consumable: "/images/category-ink.svg",
  printer: "/images/category-printers.svg",
};

/**
 * Determines whether a catalogue record comes from the development seed (`demo-*` / `DEMO-*` / `[DEMO]`).
 */
export function isDemoRecord(record: {
  slug?: string | null;
  sku?: string | null;
  name?: string | null;
}): boolean {
  const slug = record.slug?.toLowerCase() ?? "";
  const sku = record.sku?.toUpperCase() ?? "";
  const name = record.name?.toUpperCase() ?? "";
  return (
    slug.startsWith("demo-") ||
    sku.startsWith("DEMO-") ||
    name.includes("[DEMO]")
  );
}

export function getStockStatus(quantity: number): {
  label: string;
  available: boolean;
  lowStock: boolean;
} {
  if (quantity <= 0) {
    return { label: "Out of Stock", available: false, lowStock: false };
  }
  if (quantity <= 3) {
    return {
      label: `Low Stock (${quantity} left)`,
      available: true,
      lowStock: true,
    };
  }
  return { label: "In Stock", available: true, lowStock: false };
}

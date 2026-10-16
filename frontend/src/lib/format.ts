import type {
  ProductAuthenticity,
  ProductCondition,
  ProductType,
  VariantAuthenticity,
} from "@jocta/shared";

/**
 * Formats a numeric or string KES value into a readable Kenyan Shilling label.
 */
export function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "KES —";
  }
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) {
    return `KES ${amount}`;
  }
  const hasCents = Math.round(num * 100) % 100 !== 0;
  return `KES ${num.toLocaleString("en-KE", {
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
  both: "OEM & Compatible Options",
};

export const VARIANT_AUTHENTICITY_LABELS: Record<VariantAuthenticity, string> = {
  original: "Original OEM",
  compatible: "Compatible",
};

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  refurbished: "Refurbished",
};

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

import { z } from "zod";

export const PRODUCT_TYPES = [
  "toner",
  "ink",
  "drum",
  "printer_part",
  "consumable",
  "printer",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_CONDITIONS = ["new", "refurbished"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_AUTHENTICITIES = [
  "original",
  "compatible",
  "both",
] as const;
export type ProductAuthenticity = (typeof PRODUCT_AUTHENTICITIES)[number];

export const VARIANT_AUTHENTICITIES = ["original", "compatible"] as const;
export type VariantAuthenticity = (typeof VARIANT_AUTHENTICITIES)[number];

/**
 * Validates non-negative monetary values in KES (stored as NUMERIC(12,2) strings in PostgreSQL).
 */
export const kesMoneySchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "number" ? val.toFixed(2) : val.trim()))
  .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
    message: "Price in KES must be a valid non-negative amount with at most 2 decimal places",
  });

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Product slug is required")
    .max(160, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
});

export const productListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  condition: z.enum(PRODUCT_CONDITIONS).optional(),
  authenticity: z.enum(PRODUCT_AUTHENTICITIES).optional(),
  printerModel: z.string().trim().min(1).optional(),
  search: z.string().trim().max(120).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface BrandSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
}

export interface PrinterModelSummary {
  id: string;
  slug: string;
  name: string;
  series: string | null;
  brandId: string | null;
}

export interface ProductVariantSummary {
  id: string;
  productId: string;
  name: string;
  sku: string;
  oemPartNumber: string | null;
  authenticity: VariantAuthenticity;
  pageYield: number | null;
  priceKes: string;
  comparePriceKes: string | null;
  stockQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string | null;
  sku: string;
  oemPartNumber: string | null;
  productType: ProductType;
  condition: ProductCondition;
  authenticity: ProductAuthenticity;
  pageYield: number | null;
  color: string | null;
  priceKes: string;
  comparePriceKes: string | null;
  stockQuantity: number;
  images: string[];
  thumbnailUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

import { z } from "zod";
import {
  PRODUCT_AUTHENTICITIES,
  PRODUCT_CONDITIONS,
  PRODUCT_TYPES,
  VARIANT_AUTHENTICITIES,
  kesMoneySchema,
} from "./catalog.schema.js";

export interface AdminStatsSummary {
  totalProducts: number;
  publishedProducts: number;
  unpublishedProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalPrinterModels: number;
  storageMode: "memory" | "postgresql";
  persistedPath?: string;
}

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Variant name is required"),
  sku: z.string().trim().min(1, "Variant SKU is required"),
  oemPartNumber: z.string().trim().nullable().optional(),
  authenticity: z.enum(VARIANT_AUTHENTICITIES).default("original"),
  pageYield: z.coerce.number().int().positive().nullable().optional(),
  priceKes: kesMoneySchema,
  comparePriceKes: kesMoneySchema.nullable().optional(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const adminProductListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  isPublished: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  sort: z
    .enum([
      "newest",
      "price_asc",
      "price_desc",
      "name_asc",
      "name_desc",
      "stock_asc",
      "stock_desc",
    ])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name cannot exceed 200 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(160, "Slug cannot exceed 160 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case (e.g. hp-cf259a-black-toner)"),
  description: z.string().trim().default(""),
  categoryId: z.string().trim().min(1, "A valid category must be selected"),
  brandId: z.string().trim().min(1).nullable().optional(),
  sku: z
    .string()
    .trim()
    .min(2, "SKU must be at least 2 characters")
    .max(80, "SKU cannot exceed 80 characters"),
  oemPartNumber: z.string().trim().max(80).nullable().optional(),
  productType: z.enum(PRODUCT_TYPES).default("toner"),
  condition: z.enum(PRODUCT_CONDITIONS).default("new"),
  authenticity: z.enum(PRODUCT_AUTHENTICITIES).default("original"),
  pageYield: z.coerce.number().int().positive().nullable().optional(),
  color: z.string().trim().max(50).nullable().optional(),
  priceKes: kesMoneySchema,
  comparePriceKes: kesMoneySchema.nullable().optional(),
  stockQuantity: z.coerce
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative")
    .default(0),
  thumbnailUrl: z.string().trim().default(""),
  images: z.array(z.string().trim()).default([]),
  compatibleModelIds: z.array(z.string().trim()).default([]),
  variants: z.array(productVariantInputSchema).default([]),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const togglePublishSchema = z.object({
  isPublished: z.boolean(),
});
export type TogglePublishInput = z.infer<typeof togglePublishSchema>;

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case (e.g. toner-cartridges)"),
  description: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().default(""),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createBrandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters")
    .max(100, "Brand name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case (e.g. konica-minolta)"),
  logoUrl: z.string().trim().default(""),
  isActive: z.boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

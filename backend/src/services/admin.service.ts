import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import type {
  AdminProductListQuery,
  AdminStatsSummary,
  BrandSummary,
  CategorySummary,
  CreateBrandInput,
  CreateCategoryInput,
  CreateProductInput,
  PaginatedProductsResponse,
  PrinterModelSummary,
  ProductDetail,
  ProductSummary,
  ProductVariantSummary,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateProductInput,
} from "@jocta/shared";
import { getDb } from "../config/db.js";
import {
  brands,
  categories,
  printerModels,
  productPrinterCompatibility,
  products,
  productVariants,
} from "../db/schema.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  getActiveInMemoryDataset,
  getDemoStateFilePath,
  resetDevDemoDataset,
  saveDevDemoDataset,
  type CatalogDataset,
} from "./catalog.service.js";

function enrichInMemoryProduct(
  p: ProductSummary,
  dataset: CatalogDataset,
): ProductSummary {
  const cat = dataset.categories.find((c) => c.id === p.categoryId);
  const br = p.brandId
    ? dataset.brands.find((b) => b.id === p.brandId)
    : undefined;

  return {
    ...p,
    category: cat ? { id: cat.id, slug: cat.slug, name: cat.name } : null,
    brand: br ? { id: br.id, slug: br.slug, name: br.name } : null,
  };
}

export const AdminService = {
  /**
   * Retrieves live catalog statistics from the database or in-memory dataset.
   */
  async getStats(): Promise<AdminStatsSummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const totalProducts = inMemory.products.length;
      const publishedProducts = inMemory.products.filter(
        (p) => p.isPublished,
      ).length;
      const unpublishedProducts = totalProducts - publishedProducts;
      const totalCategories = inMemory.categories.length;
      const totalBrands = inMemory.brands.length;
      const totalPrinterModels = inMemory.printerModels.length;

      return {
        totalProducts,
        publishedProducts,
        unpublishedProducts,
        totalCategories,
        totalBrands,
        totalPrinterModels,
        storageMode: "memory",
        persistedPath: getDemoStateFilePath(),
      };
    }

    const db = getDb();
    const [prodStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter (where ${products.isPublished} = true)::int`,
        unpublished: sql<number>`count(*) filter (where ${products.isPublished} = false)::int`,
      })
      .from(products);

    const [catStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(categories);

    const [brandStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(brands);

    const [modelStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(printerModels);

    return {
      totalProducts: Number(prodStats?.total ?? 0),
      publishedProducts: Number(prodStats?.published ?? 0),
      unpublishedProducts: Number(prodStats?.unpublished ?? 0),
      totalCategories: Number(catStats?.total ?? 0),
      totalBrands: Number(brandStats?.total ?? 0),
      totalPrinterModels: Number(modelStats?.total ?? 0),
      storageMode: "postgresql",
    };
  },

  /**
   * Resets the local demo dataset to the factory initial seed.
   */
  async resetDemoData(): Promise<AdminStatsSummary> {
    resetDevDemoDataset();
    return this.getStats();
  },

  /**
   * Lists products for the administrative table with pagination and filtering.
   * Unlike public listing, includes unpublished products.
   */
  async listProducts(
    query: AdminProductListQuery,
  ): Promise<PaginatedProductsResponse> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      let filtered = inMemory.products.slice();

      if (query.categoryId) {
        filtered = filtered.filter((p) => p.categoryId === query.categoryId);
      }

      if (query.brandId) {
        filtered = filtered.filter((p) => p.brandId === query.brandId);
      }

      if (query.isPublished !== undefined) {
        filtered = filtered.filter((p) => p.isPublished === query.isPublished);
      }

      if (query.productType) {
        filtered = filtered.filter((p) => p.productType === query.productType);
      }

      if (query.search) {
        const s = query.search.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.sku.toLowerCase().includes(s) ||
            (p.oemPartNumber && p.oemPartNumber.toLowerCase().includes(s)),
        );
      }

      // Sort
      switch (query.sort) {
        case "price_asc":
          filtered.sort((a, b) => Number(a.priceKes) - Number(b.priceKes));
          break;
        case "price_desc":
          filtered.sort((a, b) => Number(b.priceKes) - Number(a.priceKes));
          break;
        case "name_asc":
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name_desc":
          filtered.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case "stock_asc":
          filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
          break;
        case "stock_desc":
          filtered.sort((a, b) => b.stockQuantity - a.stockQuantity);
          break;
        case "newest":
        default:
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          break;
      }

      const total = filtered.length;
      const offset = (query.page - 1) * query.limit;
      const paged = filtered
        .slice(offset, offset + query.limit)
        .map((p) => enrichInMemoryProduct(p, inMemory));

      return {
        items: paged,
        page: query.page,
        limit: query.limit,
        total,
      };
    }

    const db = getDb();
    const conditions = [];

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.brandId) {
      conditions.push(eq(products.brandId, query.brandId));
    }

    if (query.isPublished !== undefined) {
      conditions.push(eq(products.isPublished, query.isPublished));
    }

    if (query.productType) {
      conditions.push(eq(products.productType, query.productType));
    }

    if (query.search) {
      const pattern = `%${query.search.trim()}%`;
      const searchCond = or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.oemPartNumber, pattern),
      );
      if (searchCond) conditions.push(searchCond);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause;
    switch (query.sort) {
      case "price_asc":
        orderByClause = [asc(products.priceKes)];
        break;
      case "price_desc":
        orderByClause = [desc(products.priceKes)];
        break;
      case "name_asc":
        orderByClause = [asc(products.name)];
        break;
      case "name_desc":
        orderByClause = [desc(products.name)];
        break;
      case "stock_asc":
        orderByClause = [asc(products.stockQuantity)];
        break;
      case "stock_desc":
        orderByClause = [desc(products.stockQuantity)];
        break;
      case "newest":
      default:
        orderByClause = [desc(products.createdAt)];
        break;
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        brandId: products.brandId,
        sku: products.sku,
        oemPartNumber: products.oemPartNumber,
        productType: products.productType,
        condition: products.condition,
        authenticity: products.authenticity,
        pageYield: products.pageYield,
        color: products.color,
        priceKes: products.priceKes,
        comparePriceKes: products.comparePriceKes,
        stockQuantity: products.stockQuantity,
        images: products.images,
        thumbnailUrl: products.thumbnailUrl,
        isPublished: products.isPublished,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(query.limit)
      .offset(offset);

    const items: ProductSummary[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      categoryId: r.categoryId,
      brandId: r.brandId,
      category: r.categoryName
        ? {
            id: r.categoryId,
            slug: r.categorySlug ?? "",
            name: r.categoryName,
          }
        : null,
      brand: r.brandName
        ? {
            id: r.brandId ?? "",
            slug: r.brandSlug ?? "",
            name: r.brandName,
          }
        : null,
      sku: r.sku,
      oemPartNumber: r.oemPartNumber,
      productType: r.productType as any,
      condition: r.condition as any,
      authenticity: r.authenticity as any,
      pageYield: r.pageYield,
      color: r.color,
      priceKes: r.priceKes,
      comparePriceKes: r.comparePriceKes,
      stockQuantity: r.stockQuantity,
      images: r.images,
      thumbnailUrl: r.thumbnailUrl,
      isPublished: r.isPublished,
      isFeatured: r.isFeatured,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  },

  /**
   * Retrieves single product detail by ID (including variants & compatibility).
   */
  async getProductById(id: string): Promise<ProductDetail | null> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const prod = inMemory.products.find((p) => p.id === id);
      if (!prod) return null;

      const enriched = enrichInMemoryProduct(prod, inMemory);
      const variants = inMemory.variants.filter((v) => v.productId === prod.id);
      const linkedModelIds = new Set(
        inMemory.compatibilityLinks
          .filter((l) => l.productId === prod.id)
          .map((l) => l.printerModelId),
      );

      const compatiblePrinterModels = inMemory.printerModels
        .filter((m) => linkedModelIds.has(m.id))
        .map((m) => {
          const br = m.brandId
            ? inMemory.brands.find((b) => b.id === m.brandId)
            : undefined;
          return {
            ...m,
            brandName: br?.name ?? null,
            brandSlug: br?.slug ?? null,
          };
        });

      return {
        ...enriched,
        variants,
        compatiblePrinterModels,
        relatedProducts: [],
      };
    }

    const db = getDb();
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        brandId: products.brandId,
        sku: products.sku,
        oemPartNumber: products.oemPartNumber,
        productType: products.productType,
        condition: products.condition,
        authenticity: products.authenticity,
        pageYield: products.pageYield,
        color: products.color,
        priceKes: products.priceKes,
        comparePriceKes: products.comparePriceKes,
        stockQuantity: products.stockQuantity,
        images: products.images,
        thumbnailUrl: products.thumbnailUrl,
        isPublished: products.isPublished,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    const variantRows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.sortOrder));

    const compatRows = await db
      .select({
        id: printerModels.id,
        slug: printerModels.slug,
        name: printerModels.name,
        series: printerModels.series,
        brandId: printerModels.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(productPrinterCompatibility)
      .innerJoin(
        printerModels,
        eq(productPrinterCompatibility.printerModelId, printerModels.id),
      )
      .leftJoin(brands, eq(printerModels.brandId, brands.id))
      .where(eq(productPrinterCompatibility.productId, id))
      .orderBy(asc(printerModels.name));

    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      categoryId: r.categoryId,
      brandId: r.brandId,
      category: r.categoryName
        ? {
            id: r.categoryId,
            slug: r.categorySlug ?? "",
            name: r.categoryName,
          }
        : null,
      brand: r.brandName
        ? {
            id: r.brandId ?? "",
            slug: r.brandSlug ?? "",
            name: r.brandName,
          }
        : null,
      sku: r.sku,
      oemPartNumber: r.oemPartNumber,
      productType: r.productType as any,
      condition: r.condition as any,
      authenticity: r.authenticity as any,
      pageYield: r.pageYield,
      color: r.color,
      priceKes: r.priceKes,
      comparePriceKes: r.comparePriceKes,
      stockQuantity: r.stockQuantity,
      images: r.images,
      thumbnailUrl: r.thumbnailUrl,
      isPublished: r.isPublished,
      isFeatured: r.isFeatured,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      variants: variantRows.map((v) => ({
        id: v.id,
        productId: v.productId,
        name: v.name,
        sku: v.sku,
        oemPartNumber: v.oemPartNumber,
        authenticity: v.authenticity as any,
        pageYield: v.pageYield,
        priceKes: v.priceKes,
        comparePriceKes: v.comparePriceKes,
        stockQuantity: v.stockQuantity,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      })),
      compatiblePrinterModels: compatRows,
      relatedProducts: [],
    };
  },

  /**
   * Creates a new product. Validates category, brand, and uniqueness of slug & SKU.
   */
  async createProduct(input: CreateProductInput): Promise<ProductSummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      if (inMemory.products.some((p) => p.slug === input.slug)) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A product with slug '${input.slug}' already exists.`,
        );
      }
      if (inMemory.products.some((p) => p.sku === input.sku)) {
        throw new AppError(
          409,
          "DUPLICATE_SKU",
          `A product with SKU '${input.sku}' already exists.`,
        );
      }

      const cat = inMemory.categories.find((c) => c.id === input.categoryId);
      if (!cat) {
        throw new AppError(
          400,
          "INVALID_CATEGORY",
          `Selected category does not exist.`,
        );
      }

      if (input.brandId) {
        const br = inMemory.brands.find((b) => b.id === input.brandId);
        if (!br) {
          throw new AppError(
            400,
            "INVALID_BRAND",
            `Selected brand does not exist.`,
          );
        }
      }

      const now = new Date().toISOString();
      const newProduct: ProductSummary = {
        id: `prod-${crypto.randomUUID()}`,
        slug: input.slug,
        name: input.name,
        description: input.description ?? "",
        categoryId: input.categoryId,
        brandId: input.brandId ?? null,
        sku: input.sku,
        oemPartNumber: input.oemPartNumber ?? null,
        productType: input.productType,
        condition: input.condition,
        authenticity: input.authenticity,
        pageYield: input.pageYield ?? null,
        color: input.color ?? null,
        priceKes: input.priceKes,
        comparePriceKes: input.comparePriceKes ?? null,
        stockQuantity: input.stockQuantity,
        thumbnailUrl: input.thumbnailUrl ?? "",
        images: input.images ?? [],
        isPublished: input.isPublished ?? false,
        isFeatured: input.isFeatured ?? false,
        createdAt: now,
        updatedAt: now,
      };

      inMemory.products.unshift(newProduct);

      if (input.compatibleModelIds && input.compatibleModelIds.length > 0) {
        input.compatibleModelIds.forEach((pmId) => {
          inMemory.compatibilityLinks.push({
            productId: newProduct.id,
            printerModelId: pmId,
          });
        });
      }

      if (input.variants && input.variants.length > 0) {
        input.variants.forEach((v, vIdx) => {
          inMemory.variants.push({
            id: v.id ?? `${newProduct.id}-var-${vIdx + 1}`,
            productId: newProduct.id,
            name: v.name,
            sku: v.sku,
            oemPartNumber: v.oemPartNumber ?? null,
            authenticity: v.authenticity,
            pageYield: v.pageYield ?? null,
            priceKes: v.priceKes,
            comparePriceKes: v.comparePriceKes ?? null,
            stockQuantity: v.stockQuantity,
            isActive: v.isActive ?? true,
            sortOrder: v.sortOrder ?? vIdx,
          });
        });
      }

      saveDevDemoDataset(inMemory);
      return enrichInMemoryProduct(newProduct, inMemory);
    }

    const db = getDb();

    // Check slug and SKU uniqueness
    const existingSlug = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, input.slug))
      .limit(1);

    if (existingSlug.length > 0) {
      throw new AppError(
        409,
        "DUPLICATE_SLUG",
        `A product with slug '${input.slug}' already exists.`,
      );
    }

    const existingSku = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, input.sku))
      .limit(1);

    if (existingSku.length > 0) {
      throw new AppError(
        409,
        "DUPLICATE_SKU",
        `A product with SKU '${input.sku}' already exists.`,
      );
    }

    const [inserted] = await db
      .insert(products)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? "",
        categoryId: input.categoryId,
        brandId: input.brandId ?? null,
        sku: input.sku,
        oemPartNumber: input.oemPartNumber ?? null,
        productType: input.productType,
        condition: input.condition,
        authenticity: input.authenticity,
        pageYield: input.pageYield ?? null,
        color: input.color ?? null,
        priceKes: input.priceKes,
        comparePriceKes: input.comparePriceKes ?? null,
        stockQuantity: input.stockQuantity,
        thumbnailUrl: input.thumbnailUrl ?? "",
        images: input.images ?? [],
        isPublished: input.isPublished ?? false,
        isFeatured: input.isFeatured ?? false,
      })
      .returning();

    if (input.compatibleModelIds && input.compatibleModelIds.length > 0) {
      await db.insert(productPrinterCompatibility).values(
        input.compatibleModelIds.map((pmId) => ({
          productId: inserted.id,
          printerModelId: pmId,
        })),
      );
    }

    if (input.variants && input.variants.length > 0) {
      await db.insert(productVariants).values(
        input.variants.map((v, vIdx) => ({
          productId: inserted.id,
          name: v.name,
          sku: v.sku,
          oemPartNumber: v.oemPartNumber ?? null,
          authenticity: v.authenticity,
          pageYield: v.pageYield ?? null,
          priceKes: v.priceKes,
          comparePriceKes: v.comparePriceKes ?? null,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive ?? true,
          sortOrder: v.sortOrder ?? vIdx,
        })),
      );
    }

    return {
      id: inserted.id,
      slug: inserted.slug,
      name: inserted.name,
      description: inserted.description,
      categoryId: inserted.categoryId,
      brandId: inserted.brandId,
      sku: inserted.sku,
      oemPartNumber: inserted.oemPartNumber,
      productType: inserted.productType as any,
      condition: inserted.condition as any,
      authenticity: inserted.authenticity as any,
      pageYield: inserted.pageYield,
      color: inserted.color,
      priceKes: inserted.priceKes,
      comparePriceKes: inserted.comparePriceKes,
      stockQuantity: inserted.stockQuantity,
      images: inserted.images,
      thumbnailUrl: inserted.thumbnailUrl,
      isPublished: inserted.isPublished,
      isFeatured: inserted.isFeatured,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  },

  /**
   * Updates an existing product.
   */
  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductSummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const idx = inMemory.products.findIndex((p) => p.id === id);
      if (idx === -1) {
        throw new AppError(404, "NOT_FOUND", `Product not found.`);
      }

      const current = inMemory.products[idx];

      if (
        input.slug &&
        input.slug !== current.slug &&
        inMemory.products.some((p) => p.slug === input.slug && p.id !== id)
      ) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A product with slug '${input.slug}' already exists.`,
        );
      }

      if (
        input.sku &&
        input.sku !== current.sku &&
        inMemory.products.some((p) => p.sku === input.sku && p.id !== id)
      ) {
        throw new AppError(
          409,
          "DUPLICATE_SKU",
          `A product with SKU '${input.sku}' already exists.`,
        );
      }

      if (input.categoryId) {
        const cat = inMemory.categories.find((c) => c.id === input.categoryId);
        if (!cat) {
          throw new AppError(
            400,
            "INVALID_CATEGORY",
            `Selected category does not exist.`,
          );
        }
      }

      if (input.brandId) {
        const br = inMemory.brands.find((b) => b.id === input.brandId);
        if (!br) {
          throw new AppError(
            400,
            "INVALID_BRAND",
            `Selected brand does not exist.`,
          );
        }
      }

      if (input.compatibleModelIds !== undefined) {
        inMemory.compatibilityLinks = inMemory.compatibilityLinks.filter(
          (l) => l.productId !== id,
        );
        input.compatibleModelIds.forEach((pmId) => {
          inMemory.compatibilityLinks.push({
            productId: id,
            printerModelId: pmId,
          });
        });
      }

      if (input.variants !== undefined) {
        inMemory.variants = inMemory.variants.filter((v) => v.productId !== id);
        input.variants.forEach((v, vIdx) => {
          inMemory.variants.push({
            id: v.id ?? `${id}-var-${vIdx + 1}`,
            productId: id,
            name: v.name,
            sku: v.sku,
            oemPartNumber: v.oemPartNumber ?? null,
            authenticity: v.authenticity,
            pageYield: v.pageYield ?? null,
            priceKes: v.priceKes,
            comparePriceKes: v.comparePriceKes ?? null,
            stockQuantity: v.stockQuantity,
            isActive: v.isActive ?? true,
            sortOrder: v.sortOrder ?? vIdx,
          });
        });
      }

      const { compatibleModelIds: _, variants: __, ...productFields } = input;
      const updated: ProductSummary = {
        ...current,
        ...productFields,
        brandId:
          input.brandId !== undefined ? input.brandId : current.brandId,
        updatedAt: new Date().toISOString(),
      };

      inMemory.products[idx] = updated;
      saveDevDemoDataset(inMemory);
      return enrichInMemoryProduct(updated, inMemory);
    }

    const db = getDb();

    // Verify product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Product not found.`);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugClash = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.slug, input.slug), ne(products.id, id)))
        .limit(1);

      if (slugClash.length > 0) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A product with slug '${input.slug}' already exists.`,
        );
      }
    }

    if (input.sku && input.sku !== existing.sku) {
      const skuClash = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.sku, input.sku), ne(products.id, id)))
        .limit(1);

      if (skuClash.length > 0) {
        throw new AppError(
          409,
          "DUPLICATE_SKU",
          `A product with SKU '${input.sku}' already exists.`,
        );
      }
    }

    const { compatibleModelIds, variants, ...productFields } = input;
    const updateValues: Record<string, any> = {
      ...productFields,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(products)
      .set(updateValues)
      .where(eq(products.id, id))
      .returning();

    if (compatibleModelIds !== undefined) {
      await db
        .delete(productPrinterCompatibility)
        .where(eq(productPrinterCompatibility.productId, id));
      if (compatibleModelIds.length > 0) {
        await db.insert(productPrinterCompatibility).values(
          compatibleModelIds.map((pmId) => ({
            productId: id,
            printerModelId: pmId,
          })),
        );
      }
    }

    if (variants !== undefined) {
      await db
        .delete(productVariants)
        .where(eq(productVariants.productId, id));
      if (variants.length > 0) {
        await db.insert(productVariants).values(
          variants.map((v, vIdx) => ({
            productId: id,
            name: v.name,
            sku: v.sku,
            oemPartNumber: v.oemPartNumber ?? null,
            authenticity: v.authenticity,
            pageYield: v.pageYield ?? null,
            priceKes: v.priceKes,
            comparePriceKes: v.comparePriceKes ?? null,
            stockQuantity: v.stockQuantity,
            isActive: v.isActive ?? true,
            sortOrder: v.sortOrder ?? vIdx,
          })),
        );
      }
    }

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      categoryId: updated.categoryId,
      brandId: updated.brandId,
      sku: updated.sku,
      oemPartNumber: updated.oemPartNumber,
      productType: updated.productType as any,
      condition: updated.condition as any,
      authenticity: updated.authenticity as any,
      pageYield: updated.pageYield,
      color: updated.color,
      priceKes: updated.priceKes,
      comparePriceKes: updated.comparePriceKes,
      stockQuantity: updated.stockQuantity,
      images: updated.images,
      thumbnailUrl: updated.thumbnailUrl,
      isPublished: updated.isPublished,
      isFeatured: updated.isFeatured,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  /**
   * Fast toggle for publication status.
   */
  async toggleProductPublish(
    id: string,
    isPublished: boolean,
  ): Promise<ProductSummary> {
    return this.updateProduct(id, { isPublished });
  },

  /**
   * Creates a new category.
   */
  async createCategory(input: CreateCategoryInput): Promise<CategorySummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      if (inMemory.categories.some((c) => c.slug === input.slug)) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A category with slug '${input.slug}' already exists.`,
        );
      }

      const newCat: CategorySummary & { isActive: boolean } = {
        id: `cat-${crypto.randomUUID()}`,
        slug: input.slug,
        name: input.name,
        description: input.description ?? "",
        imageUrl: input.imageUrl ?? "",
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      };

      inMemory.categories.push(newCat);
      saveDevDemoDataset(inMemory);
      return {
        id: newCat.id,
        slug: newCat.slug,
        name: newCat.name,
        description: newCat.description,
        imageUrl: newCat.imageUrl,
        sortOrder: newCat.sortOrder,
      };
    }

    const db = getDb();
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, input.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(
        409,
        "DUPLICATE_SLUG",
        `A category with slug '${input.slug}' already exists.`,
      );
    }

    const [inserted] = await db
      .insert(categories)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? "",
        imageUrl: input.imageUrl ?? "",
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    return {
      id: inserted.id,
      slug: inserted.slug,
      name: inserted.name,
      description: inserted.description,
      imageUrl: inserted.imageUrl,
      sortOrder: inserted.sortOrder,
    };
  },

  /**
   * Updates an existing category.
   */
  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategorySummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const idx = inMemory.categories.findIndex((c) => c.id === id);
      if (idx === -1) {
        throw new AppError(404, "NOT_FOUND", `Category not found.`);
      }

      const current = inMemory.categories[idx];
      if (
        input.slug &&
        input.slug !== current.slug &&
        inMemory.categories.some((c) => c.slug === input.slug && c.id !== id)
      ) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A category with slug '${input.slug}' already exists.`,
        );
      }

      const updated = {
        ...current,
        ...input,
      };

      inMemory.categories[idx] = updated;
      saveDevDemoDataset(inMemory);
      return {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        imageUrl: updated.imageUrl,
        sortOrder: updated.sortOrder,
      };
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Category not found.`);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugClash = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, input.slug), ne(categories.id, id)))
        .limit(1);

      if (slugClash.length > 0) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A category with slug '${input.slug}' already exists.`,
        );
      }
    }

    const [updated] = await db
      .update(categories)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      imageUrl: updated.imageUrl,
      sortOrder: updated.sortOrder,
    };
  },

  /**
   * Creates a new brand.
   */
  async createBrand(input: CreateBrandInput): Promise<BrandSummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      if (inMemory.brands.some((b) => b.slug === input.slug)) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A brand with slug '${input.slug}' already exists.`,
        );
      }
      if (inMemory.brands.some((b) => b.name.toLowerCase() === input.name.toLowerCase())) {
        throw new AppError(
          409,
          "DUPLICATE_NAME",
          `A brand with name '${input.name}' already exists.`,
        );
      }

      const newBrand: BrandSummary & { isActive: boolean } = {
        id: `brand-${crypto.randomUUID()}`,
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl ?? "",
        isActive: input.isActive ?? true,
      };

      inMemory.brands.push(newBrand);
      saveDevDemoDataset(inMemory);
      return {
        id: newBrand.id,
        slug: newBrand.slug,
        name: newBrand.name,
        logoUrl: newBrand.logoUrl,
      };
    }

    const db = getDb();
    const existing = await db
      .select({ id: brands.id })
      .from(brands)
      .where(or(eq(brands.slug, input.slug), eq(brands.name, input.name)))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(
        409,
        "DUPLICATE_BRAND",
        `A brand with this slug or name already exists.`,
      );
    }

    const [inserted] = await db
      .insert(brands)
      .values({
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl ?? "",
        isActive: input.isActive ?? true,
      })
      .returning();

    return {
      id: inserted.id,
      slug: inserted.slug,
      name: inserted.name,
      logoUrl: inserted.logoUrl,
    };
  },

  /**
   * Updates an existing brand.
   */
  async updateBrand(
    id: string,
    input: UpdateBrandInput,
  ): Promise<BrandSummary> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const idx = inMemory.brands.findIndex((b) => b.id === id);
      if (idx === -1) {
        throw new AppError(404, "NOT_FOUND", `Brand not found.`);
      }

      const current = inMemory.brands[idx];
      if (
        input.slug &&
        input.slug !== current.slug &&
        inMemory.brands.some((b) => b.slug === input.slug && b.id !== id)
      ) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A brand with slug '${input.slug}' already exists.`,
        );
      }

      if (
        input.name &&
        input.name.toLowerCase() !== current.name.toLowerCase() &&
        inMemory.brands.some(
          (b) =>
            b.name.toLowerCase() === input.name!.toLowerCase() && b.id !== id,
        )
      ) {
        throw new AppError(
          409,
          "DUPLICATE_NAME",
          `A brand with name '${input.name}' already exists.`,
        );
      }

      const updated = {
        ...current,
        ...input,
      };

      inMemory.brands[idx] = updated;
      saveDevDemoDataset(inMemory);
      return {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        logoUrl: updated.logoUrl,
      };
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Brand not found.`);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugClash = await db
        .select({ id: brands.id })
        .from(brands)
        .where(and(eq(brands.slug, input.slug), ne(brands.id, id)))
        .limit(1);

      if (slugClash.length > 0) {
        throw new AppError(
          409,
          "DUPLICATE_SLUG",
          `A brand with slug '${input.slug}' already exists.`,
        );
      }
    }

    if (input.name && input.name !== existing.name) {
      const nameClash = await db
        .select({ id: brands.id })
        .from(brands)
        .where(and(eq(brands.name, input.name), ne(brands.id, id)))
        .limit(1);

      if (nameClash.length > 0) {
        throw new AppError(
          409,
          "DUPLICATE_NAME",
          `A brand with name '${input.name}' already exists.`,
        );
      }
    }

    const [updated] = await db
      .update(brands)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      logoUrl: updated.logoUrl,
    };
  },
};

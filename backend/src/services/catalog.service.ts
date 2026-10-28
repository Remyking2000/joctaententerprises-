import fs from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import type {
  BrandSummary,
  CategorySummary,
  CompatibleProductsQuery,
  CompatibleProductsResponse,
  PaginatedProductsResponse,
  PrinterModelQuery,
  PrinterModelSummary,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  ProductVariantSummary,
} from "@jocta/shared";
import { env } from "../config/env.js";
import { getDb } from "../config/db.js";
import {
  brands,
  categories,
  printerModels,
  productPrinterCompatibility,
  products,
  productVariants,
} from "../db/schema.js";
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_PRINTER_MODELS,
  DEMO_PRODUCTS,
} from "../db/seed.js";

export interface CatalogDataset {
  categories: (CategorySummary & { isActive: boolean })[];
  brands: (BrandSummary & { isActive: boolean })[];
  printerModels: PrinterModelSummary[];
  products: ProductSummary[];
  variants: ProductVariantSummary[];
  compatibilityLinks: { productId: string; printerModelId: string }[];
}

let testDatasetOverride: CatalogDataset | null = null;
let cachedDevDemoDataset: CatalogDataset | null = null;

/**
 * Allows automated tests to inject an in-memory dataset to verify catalog
 * filtering, sorting, unpublished-record exclusion, and strict printer
 * compatibility rules without requiring a live PostgreSQL socket.
 */
export function setCatalogDatasetForTesting(dataset: CatalogDataset | null) {
  testDatasetOverride = dataset;
}

const DEMO_STATE_FILE = path.resolve(process.cwd(), "backend/.demo-state.json");

export function getDemoStateFilePath(): string {
  return DEMO_STATE_FILE;
}

export function saveDevDemoDataset(dataset: CatalogDataset): void {
  try {
    cachedDevDemoDataset = dataset;
    fs.writeFileSync(DEMO_STATE_FILE, JSON.stringify(dataset, null, 2), "utf8");
  } catch (err) {
    console.error("[demo-state] Failed to persist demo state to disk:", err);
  }
}

export function resetDevDemoDataset(): CatalogDataset {
  try {
    if (fs.existsSync(DEMO_STATE_FILE)) {
      fs.unlinkSync(DEMO_STATE_FILE);
    }
  } catch (err) {
    console.error("[demo-state] Failed to remove demo state file:", err);
  }
  cachedDevDemoDataset = null;
  return getDevDemoDataset();
}

/**
 * Builds the clearly labeled `[DEMO]` dataset for local development preview
 * when `DATABASE_URL` has not been configured yet, persisted to disk.
 */
function getDevDemoDataset(): CatalogDataset {
  if (cachedDevDemoDataset) return cachedDevDemoDataset;

  // Try reading persisted state from disk first
  try {
    if (fs.existsSync(DEMO_STATE_FILE)) {
      const raw = fs.readFileSync(DEMO_STATE_FILE, "utf8");
      const parsed = JSON.parse(raw) as CatalogDataset;
      if (
        Array.isArray(parsed?.categories) &&
        Array.isArray(parsed?.brands) &&
        Array.isArray(parsed?.products)
      ) {
        cachedDevDemoDataset = parsed;
        return cachedDevDemoDataset;
      }
    }
  } catch (err) {
    console.warn("[demo-state] Error reading saved state file, generating fresh seed:", err);
  }

  const catList = DEMO_CATEGORIES.map((c, idx) => ({
    id: `demo-cat-${idx + 1}`,
    slug: c.slug,
    name: c.name,
    description: c.description,
    imageUrl: "",
    sortOrder: c.sortOrder,
    isActive: true,
  }));

  const brandList = DEMO_BRANDS.map((b, idx) => ({
    id: `demo-brand-${idx + 1}`,
    slug: b.slug,
    name: b.name,
    logoUrl: "",
    isActive: true,
  }));

  const catIdBySlug = new Map(catList.map((c) => [c.slug, c.id]));
  const brandIdBySlug = new Map(brandList.map((b) => [b.slug, b.id]));

  const modelList: PrinterModelSummary[] = DEMO_PRINTER_MODELS.map((m, idx) => ({
    id: `demo-pm-${idx + 1}`,
    slug: m.slug,
    name: m.name,
    series: m.series,
    brandId: brandIdBySlug.get(m.brandSlug) ?? null,
  }));

  const modelIdBySlug = new Map(modelList.map((m) => [m.slug, m.id]));

  const productList: ProductSummary[] = [];
  const variantList: ProductVariantSummary[] = [];
  const compatibilityLinks: { productId: string; printerModelId: string }[] = [];

  DEMO_PRODUCTS.forEach((p, idx) => {
    const productId = `demo-prod-${idx + 1}`;
    const categoryId = catIdBySlug.get(p.categorySlug) ?? catList[0].id;
    const brandId = brandIdBySlug.get(p.brandSlug) ?? null;

    productList.push({
      id: productId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      categoryId,
      brandId,
      sku: p.sku,
      oemPartNumber: p.oemPartNumber,
      productType: p.productType,
      condition: p.condition,
      authenticity: p.authenticity,
      pageYield: p.pageYield,
      color: p.color,
      priceKes: p.priceKes,
      comparePriceKes: p.comparePriceKes,
      stockQuantity: p.stockQuantity,
      images: [],
      thumbnailUrl: "",
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      createdAt: new Date(Date.now() - idx * 3600_000).toISOString(),
      updatedAt: new Date(Date.now() - idx * 3600_000).toISOString(),
    });

    p.variants.forEach((v, vIdx) => {
      variantList.push({
        id: `${productId}-var-${vIdx + 1}`,
        productId,
        name: v.name,
        sku: v.sku,
        oemPartNumber: v.oemPartNumber,
        authenticity: v.authenticity,
        pageYield: v.pageYield,
        priceKes: v.priceKes,
        comparePriceKes: v.comparePriceKes,
        stockQuantity: v.stockQuantity,
        isActive: true,
        sortOrder: v.sortOrder,
      });
    });

    p.compatibleModelSlugs.forEach((mSlug) => {
      const pmId = modelIdBySlug.get(mSlug);
      if (pmId) {
        compatibilityLinks.push({ productId, printerModelId: pmId });
      }
    });
  });

  cachedDevDemoDataset = {
    categories: catList,
    brands: brandList,
    printerModels: modelList,
    products: productList,
    variants: variantList,
    compatibilityLinks,
  };

  saveDevDemoDataset(cachedDevDemoDataset);

  return cachedDevDemoDataset;
}

export function getActiveInMemoryDataset(): CatalogDataset | null {
  if (testDatasetOverride) return testDatasetOverride;
  if (!env.DATABASE_URL && env.NODE_ENV === "development") {
    return getDevDemoDataset();
  }
  return null;
}

function executeInMemoryCatalog(dataset: CatalogDataset) {
  const activeCategories = dataset.categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const activeBrands = dataset.brands
    .filter((b) => b.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));

  const categoryById = new Map(activeCategories.map((c) => [c.id, c]));
  const brandById = new Map(activeBrands.map((b) => [b.id, b]));

  function enrichProduct(p: ProductSummary): ProductSummary {
    const cat = categoryById.get(p.categoryId);
    const br = p.brandId ? brandById.get(p.brandId) : undefined;
    return {
      ...p,
      category: cat ? { id: cat.id, slug: cat.slug, name: cat.name } : null,
      brand: br ? { id: br.id, slug: br.slug, name: br.name } : null,
    };
  }

  return {
    async listCategories(): Promise<CategorySummary[]> {
      return activeCategories.map(({ isActive: _, ...rest }) => rest);
    },

    async listBrands(): Promise<BrandSummary[]> {
      return activeBrands.map(({ isActive: _, ...rest }) => rest);
    },

    async listPrinterModels(
      query: PrinterModelQuery,
    ): Promise<PrinterModelSummary[]> {
      const publishedProductIds = new Set(
        dataset.products.filter((p) => p.isPublished).map((p) => p.id),
      );

      let models = dataset.printerModels.map((pm) => {
        const brand = pm.brandId ? brandById.get(pm.brandId) : undefined;
        const compatCount = dataset.compatibilityLinks.filter(
          (link) =>
            link.printerModelId === pm.id &&
            publishedProductIds.has(link.productId),
        ).length;

        return {
          ...pm,
          brandName: brand?.name ?? null,
          brandSlug: brand?.slug ?? null,
          compatibleProductCount: compatCount,
        };
      });

      if (query.brand) {
        models = models.filter((m) => m.brandSlug === query.brand);
      }

      if (query.search) {
        const q = query.search.toLowerCase();
        models = models.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.series && m.series.toLowerCase().includes(q)) ||
            (m.brandName && m.brandName.toLowerCase().includes(q)),
        );
      }

      return models
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, query.limit);
    },

    async getCompatibleProductsForPrinterModel(
      printerModelSlug: string,
      query: CompatibleProductsQuery,
    ): Promise<CompatibleProductsResponse | null> {
      const pm = dataset.printerModels.find((m) => m.slug === printerModelSlug);
      if (!pm) return null;

      const brand = pm.brandId ? brandById.get(pm.brandId) : undefined;
      const linkedProductIds = new Set(
        dataset.compatibilityLinks
          .filter((l) => l.printerModelId === pm.id)
          .map((l) => l.productId),
      );

      let items = dataset.products
        .filter((p) => p.isPublished && linkedProductIds.has(p.id))
        .map(enrichProduct);

      if (query.category) {
        items = items.filter((p) => p.category?.slug === query.category);
      }
      if (query.productType) {
        items = items.filter((p) => p.productType === query.productType);
      }
      if (query.authenticity) {
        items = items.filter((p) => p.authenticity === query.authenticity);
      }

      const publishedProductIds = new Set(
        dataset.products.filter((p) => p.isPublished).map((p) => p.id),
      );
      const totalCompatibleCount = dataset.compatibilityLinks.filter(
        (l) =>
          l.printerModelId === pm.id && publishedProductIds.has(l.productId),
      ).length;

      return {
        printerModel: {
          ...pm,
          brandName: brand?.name ?? null,
          brandSlug: brand?.slug ?? null,
          compatibleProductCount: totalCompatibleCount,
        },
        items,
      };
    },

    async listProducts(
      filters: ProductListQuery,
    ): Promise<PaginatedProductsResponse> {
      let items = dataset.products
        .filter((p) => p.isPublished)
        .map(enrichProduct);

      if (filters.category) {
        items = items.filter((p) => p.category?.slug === filters.category);
      }
      if (filters.brand) {
        items = items.filter((p) => p.brand?.slug === filters.brand);
      }
      if (filters.productType) {
        items = items.filter((p) => p.productType === filters.productType);
      }
      if (filters.condition) {
        items = items.filter((p) => p.condition === filters.condition);
      }
      if (filters.authenticity) {
        items = items.filter((p) => p.authenticity === filters.authenticity);
      }
      if (filters.featured !== undefined) {
        items = items.filter((p) => p.isFeatured === filters.featured);
      }
      if (filters.printerModel) {
        const q = filters.printerModel.toLowerCase();
        const matchingModels = dataset.printerModels.filter(
          (m) =>
            m.slug.toLowerCase() === q || m.name.toLowerCase().includes(q),
        );
        const modelIds = new Set(matchingModels.map((m) => m.id));
        const compatProductIds = new Set(
          dataset.compatibilityLinks
            .filter((l) => modelIds.has(l.printerModelId))
            .map((l) => l.productId),
        );
        items = items.filter((p) => compatProductIds.has(p.id));
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.oemPartNumber && p.oemPartNumber.toLowerCase().includes(q)) ||
            p.description.toLowerCase().includes(q),
        );
      }

      items.sort((a, b) => {
        switch (filters.sort) {
          case "price_asc":
            return parseFloat(a.priceKes) - parseFloat(b.priceKes);
          case "price_desc":
            return parseFloat(b.priceKes) - parseFloat(a.priceKes);
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "newest":
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          case "featured":
          default:
            if (a.isFeatured !== b.isFeatured) {
              return a.isFeatured ? -1 : 1;
            }
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });

      const total = items.length;
      const offset = (filters.page - 1) * filters.limit;
      const paged = items.slice(offset, offset + filters.limit);

      return {
        items: paged,
        page: filters.page,
        limit: filters.limit,
        total,
      };
    },

    async getProductBySlug(slug: string): Promise<ProductDetail | null> {
      const product = dataset.products.find(
        (p) => p.slug === slug && p.isPublished,
      );
      if (!product) return null;

      const enriched = enrichProduct(product);
      const variants = dataset.variants
        .filter((v) => v.productId === product.id && v.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      const linkedModelIds = new Set(
        dataset.compatibilityLinks
          .filter((l) => l.productId === product.id)
          .map((l) => l.printerModelId),
      );

      const compatiblePrinterModels: PrinterModelSummary[] = dataset.printerModels
        .filter((m) => linkedModelIds.has(m.id))
        .map((m) => {
          const br = m.brandId ? brandById.get(m.brandId) : undefined;
          return {
            ...m,
            brandName: br?.name ?? null,
            brandSlug: br?.slug ?? null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const relatedProducts = dataset.products
        .filter(
          (p) =>
            p.isPublished &&
            p.id !== product.id &&
            p.categoryId === product.categoryId,
        )
        .slice(0, 4)
        .map(enrichProduct);

      return {
        ...enriched,
        variants,
        compatiblePrinterModels,
        relatedProducts,
      };
    },
  };
}

export const CatalogService = {
  async listCategories(): Promise<CategorySummary[]> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(inMemory).listCategories();
    }

    const db = getDb();
    return db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  },

  async listBrands(): Promise<BrandSummary[]> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(inMemory).listBrands();
    }

    const db = getDb();
    return db
      .select({
        id: brands.id,
        slug: brands.slug,
        name: brands.name,
        logoUrl: brands.logoUrl,
      })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name));
  },

  async listPrinterModels(
    query: PrinterModelQuery,
  ): Promise<PrinterModelSummary[]> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(inMemory).listPrinterModels(query);
    }

    const db = getDb();
    const conditions = [];

    if (query.brand) {
      conditions.push(eq(brands.slug, query.brand));
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      const searchCond = or(
        ilike(printerModels.name, pattern),
        ilike(printerModels.series, pattern),
        ilike(brands.name, pattern),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: printerModels.id,
        slug: printerModels.slug,
        name: printerModels.name,
        series: printerModels.series,
        brandId: printerModels.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        compatibleProductCount: sql<number>`(
          SELECT count(*)::int
          FROM product_printer_compatibility ppc
          INNER JOIN products p ON p.id = ppc.product_id
          WHERE ppc.printer_model_id = ${printerModels.id}
            AND p.is_published = true
        )`,
      })
      .from(printerModels)
      .leftJoin(brands, eq(printerModels.brandId, brands.id))
      .where(whereClause)
      .orderBy(asc(printerModels.name))
      .limit(query.limit);

    return rows;
  },

  async getCompatibleProductsForPrinterModel(
    printerModelSlug: string,
    query: CompatibleProductsQuery,
  ): Promise<CompatibleProductsResponse | null> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(
        inMemory,
      ).getCompatibleProductsForPrinterModel(printerModelSlug, query);
    }

    const db = getDb();
    const [modelRow] = await db
      .select({
        id: printerModels.id,
        slug: printerModels.slug,
        name: printerModels.name,
        series: printerModels.series,
        brandId: printerModels.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        compatibleProductCount: sql<number>`(
          SELECT count(*)::int
          FROM product_printer_compatibility ppc
          INNER JOIN products p ON p.id = ppc.product_id
          WHERE ppc.printer_model_id = ${printerModels.id}
            AND p.is_published = true
        )`,
      })
      .from(printerModels)
      .leftJoin(brands, eq(printerModels.brandId, brands.id))
      .where(eq(printerModels.slug, printerModelSlug))
      .limit(1);

    if (!modelRow) {
      return null;
    }

    const compatRows = await db
      .select({ productId: productPrinterCompatibility.productId })
      .from(productPrinterCompatibility)
      .where(eq(productPrinterCompatibility.printerModelId, modelRow.id));

    if (compatRows.length === 0) {
      return {
        printerModel: modelRow,
        items: [],
      };
    }

    const productConditions = [
      eq(products.isPublished, true),
      inArray(
        products.id,
        compatRows.map((r) => r.productId),
      ),
    ];

    if (query.category) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, query.category))
        .limit(1);

      if (!cat) {
        return { printerModel: modelRow, items: [] };
      }
      productConditions.push(eq(products.categoryId, cat.id));
    }

    if (query.productType) {
      productConditions.push(eq(products.productType, query.productType));
    }

    if (query.authenticity) {
      productConditions.push(eq(products.authenticity, query.authenticity));
    }

    const rows = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
        },
        brand: {
          id: brands.id,
          slug: brands.slug,
          name: brands.name,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(...productConditions))
      .orderBy(desc(products.isFeatured), asc(products.name));

    const items: ProductSummary[] = rows.map((r) => ({
      ...(r.product as unknown as ProductSummary),
      createdAt: r.product.createdAt.toISOString(),
      updatedAt: r.product.updatedAt.toISOString(),
      category: r.category?.id ? r.category : null,
      brand: r.brand?.id ? r.brand : null,
    }));

    return {
      printerModel: modelRow,
      items,
    };
  },

  async listProducts(
    filters: ProductListQuery,
  ): Promise<PaginatedProductsResponse> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(inMemory).listProducts(filters);
    }

    const db = getDb();
    const conditions = [eq(products.isPublished, true)];

    if (filters.category) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, filters.category))
        .limit(1);

      if (!cat) {
        return { items: [], page: filters.page, limit: filters.limit, total: 0 };
      }
      conditions.push(eq(products.categoryId, cat.id));
    }

    if (filters.brand) {
      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(eq(brands.slug, filters.brand))
        .limit(1);

      if (!brand) {
        return { items: [], page: filters.page, limit: filters.limit, total: 0 };
      }
      conditions.push(eq(products.brandId, brand.id));
    }

    if (filters.productType) {
      conditions.push(eq(products.productType, filters.productType));
    }

    if (filters.condition) {
      conditions.push(eq(products.condition, filters.condition));
    }

    if (filters.authenticity) {
      conditions.push(eq(products.authenticity, filters.authenticity));
    }

    if (filters.featured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.featured));
    }

    if (filters.printerModel) {
      const matchingModels = await db
        .select({ id: printerModels.id })
        .from(printerModels)
        .where(
          or(
            eq(printerModels.slug, filters.printerModel),
            ilike(printerModels.name, `%${filters.printerModel}%`),
          ),
        );

      if (matchingModels.length === 0) {
        return { items: [], page: filters.page, limit: filters.limit, total: 0 };
      }

      const modelIds = matchingModels.map((m) => m.id);
      const compatRows = await db
        .select({ productId: productPrinterCompatibility.productId })
        .from(productPrinterCompatibility)
        .where(inArray(productPrinterCompatibility.printerModelId, modelIds));

      if (compatRows.length === 0) {
        return { items: [], page: filters.page, limit: filters.limit, total: 0 };
      }

      conditions.push(
        inArray(
          products.id,
          compatRows.map((r) => r.productId),
        ),
      );
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      const searchCond = or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.oemPartNumber, pattern),
        ilike(products.description, pattern),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = and(...conditions);
    const offset = (filters.page - 1) * filters.limit;

    const orderByClauses = (() => {
      switch (filters.sort) {
        case "price_asc":
          return [asc(products.priceKes), asc(products.name)];
        case "price_desc":
          return [desc(products.priceKes), asc(products.name)];
        case "name_asc":
          return [asc(products.name)];
        case "name_desc":
          return [desc(products.name)];
        case "newest":
          return [desc(products.createdAt)];
        case "featured":
        default:
          return [desc(products.isFeatured), desc(products.createdAt)];
      }
    })();

    const [rows, countRows] = await Promise.all([
      db
        .select({
          product: products,
          category: {
            id: categories.id,
            slug: categories.slug,
            name: categories.name,
          },
          brand: {
            id: brands.id,
            slug: brands.slug,
            name: brands.name,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(whereClause)
        .orderBy(...orderByClauses)
        .limit(filters.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
    ]);

    const items: ProductSummary[] = rows.map((r) => ({
      ...(r.product as unknown as ProductSummary),
      createdAt: r.product.createdAt.toISOString(),
      updatedAt: r.product.updatedAt.toISOString(),
      category: r.category?.id ? r.category : null,
      brand: r.brand?.id ? r.brand : null,
    }));

    return {
      items,
      page: filters.page,
      limit: filters.limit,
      total: countRows[0]?.count ?? 0,
    };
  },

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      return executeInMemoryCatalog(inMemory).getProductBySlug(slug);
    }

    const db = getDb();
    const [row] = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
        },
        brand: {
          id: brands.id,
          slug: brands.slug,
          name: brands.name,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.slug, slug), eq(products.isPublished, true)))
      .limit(1);

    if (!row) {
      return null;
    }

    const product = row.product;

    const [variants, compatibleModels, relatedRows] = await Promise.all([
      db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, product.id),
            eq(productVariants.isActive, true),
          ),
        )
        .orderBy(asc(productVariants.sortOrder), asc(productVariants.name)),
      db
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
        .where(eq(productPrinterCompatibility.productId, product.id))
        .orderBy(asc(printerModels.name)),
      db
        .select({
          product: products,
          category: {
            id: categories.id,
            slug: categories.slug,
            name: categories.name,
          },
          brand: {
            id: brands.id,
            slug: brands.slug,
            name: brands.name,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(
          and(
            eq(products.isPublished, true),
            eq(products.categoryId, product.categoryId),
            ne(products.id, product.id),
          ),
        )
        .orderBy(desc(products.isFeatured), desc(products.createdAt))
        .limit(4),
    ]);

    const relatedProducts: ProductSummary[] = relatedRows.map((r) => ({
      ...(r.product as unknown as ProductSummary),
      createdAt: r.product.createdAt.toISOString(),
      updatedAt: r.product.updatedAt.toISOString(),
      category: r.category?.id ? r.category : null,
      brand: r.brand?.id ? r.brand : null,
    }));

    return {
      ...(product as unknown as ProductSummary),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      category: row.category?.id ? row.category : null,
      brand: row.brand?.id ? row.brand : null,
      variants: variants as unknown as ProductVariantSummary[],
      compatiblePrinterModels: compatibleModels,
      relatedProducts,
    };
  },
};

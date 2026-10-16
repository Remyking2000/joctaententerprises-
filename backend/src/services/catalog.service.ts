import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { ProductListQuery } from "@jocta/shared";
import { getDb } from "../config/db.js";
import {
  brands,
  categories,
  printerModels,
  productPrinterCompatibility,
  products,
  productVariants,
} from "../db/schema.js";

export const CatalogService = {
  async listCategories() {
    const db = getDb();
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  },

  async listBrands() {
    const db = getDb();
    return db
      .select()
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name));
  },

  async listProducts(filters: ProductListQuery) {
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
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = and(...conditions);
    const offset = (filters.page - 1) * filters.limit;

    const [items, countRows] = await Promise.all([
      db
        .select()
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.isFeatured), desc(products.createdAt))
        .limit(filters.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
    ]);

    return {
      items,
      page: filters.page,
      limit: filters.limit,
      total: countRows[0]?.count ?? 0,
    };
  },

  async getProductBySlug(slug: string) {
    const db = getDb();
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isPublished, true)))
      .limit(1);

    if (!product) {
      return null;
    }

    const [variants, compatibleModels] = await Promise.all([
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
        })
        .from(productPrinterCompatibility)
        .innerJoin(
          printerModels,
          eq(productPrinterCompatibility.printerModelId, printerModels.id),
        )
        .where(eq(productPrinterCompatibility.productId, product.id))
        .orderBy(asc(printerModels.name)),
    ]);

    return {
      ...product,
      variants,
      compatiblePrinterModels: compatibleModels,
    };
  },
};

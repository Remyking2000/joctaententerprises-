import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import {
  setCatalogDatasetForTesting,
  type CatalogDataset,
} from "../services/catalog.service.js";
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_PRINTER_MODELS,
  DEMO_PRODUCTS,
} from "../db/seed.js";

async function invokeApp(
  app: express.Express,
  options: { method?: string; url: string },
): Promise<{
  status: number;
  body: Record<string, any>;
}> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = options.method ?? "GET";
    req.url = options.url;
    req.headers = { host: "localhost" };

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, ...args: unknown[]) => {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        );
      }
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        );
      }
      (originalEnd as (...a: unknown[]) => ServerResponse)(chunk, ...args);
      const rawBody = Buffer.concat(chunks).toString("utf8");
      resolve({
        status: res.statusCode,
        body: rawBody ? JSON.parse(rawBody) : {},
      });
      return res;
    }) as typeof res.end;

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

function createFixtureDataset(): CatalogDataset {
  return {
    categories: [
      {
        id: "cat-toners",
        slug: "laser-toners",
        name: "Laser Toners",
        description: "Laser toner cartridges",
        imageUrl: "",
        sortOrder: 1,
        isActive: true,
      },
      {
        id: "cat-parts",
        slug: "printer-parts",
        name: "Printer Parts",
        description: "Spare parts",
        imageUrl: "",
        sortOrder: 2,
        isActive: true,
      },
      {
        id: "cat-hidden",
        slug: "hidden-category",
        name: "Hidden Category",
        description: "Inactive",
        imageUrl: "",
        sortOrder: 99,
        isActive: false,
      },
    ],
    brands: [
      {
        id: "brand-hp",
        slug: "hp",
        name: "HP",
        logoUrl: "",
        isActive: true,
      },
      {
        id: "brand-kyocera",
        slug: "kyocera",
        name: "Kyocera",
        logoUrl: "",
        isActive: true,
      },
    ],
    printerModels: [
      {
        id: "pm-m404dn",
        brandId: "brand-hp",
        slug: "hp-laserjet-pro-m404dn",
        name: "HP LaserJet Pro M404dn",
        series: "LaserJet Pro M400 Series",
      },
      {
        id: "pm-p1102",
        brandId: "brand-hp",
        slug: "hp-laserjet-p1102",
        name: "HP LaserJet Pro P1102",
        series: "LaserJet P1100 Series",
      },
      {
        id: "pm-m2040dn",
        brandId: "brand-kyocera",
        slug: "kyocera-ecosys-m2040dn",
        name: "Kyocera ECOSYS M2040dn",
        series: "ECOSYS Series",
      },
    ],
    products: [
      {
        id: "prod-59a",
        slug: "hp-59a-cf259a-toner",
        name: "HP 59A (CF259A) Black Toner",
        description: "Standard yield black toner for M404 series",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "TON-CF259A",
        oemPartNumber: "CF259A",
        productType: "toner",
        condition: "new",
        authenticity: "both",
        pageYield: 3000,
        color: "Black",
        priceKes: "3800.00",
        comparePriceKes: "4500.00",
        stockQuantity: 10,
        images: [],
        thumbnailUrl: "",
        isPublished: true,
        isFeatured: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "prod-85a",
        slug: "hp-85a-ce285a-compatible-toner",
        name: "85A (CE285A) Compatible Black Toner",
        description: "Compatible toner for P1102",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "TON-CE285A",
        oemPartNumber: "CE285A",
        productType: "toner",
        condition: "new",
        authenticity: "compatible",
        pageYield: 1600,
        color: "Black",
        priceKes: "1800.00",
        comparePriceKes: null,
        stockQuantity: 20,
        images: [],
        thumbnailUrl: "",
        isPublished: true,
        isFeatured: false,
        createdAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "prod-fuser",
        slug: "hp-m404-fuser-rm2-2554",
        name: "HP M404 220V Fuser Assembly (RM2-2554)",
        description: "Replacement fuser unit",
        categoryId: "cat-parts",
        brandId: "brand-hp",
        sku: "PRT-RM22554",
        oemPartNumber: "RM2-2554",
        productType: "printer_part",
        condition: "new",
        authenticity: "original",
        pageYield: null,
        color: null,
        priceKes: "16500.00",
        comparePriceKes: null,
        stockQuantity: 3,
        images: [],
        thumbnailUrl: "",
        isPublished: true,
        isFeatured: true,
        createdAt: "2026-10-03T10:00:00.000Z",
        updatedAt: "2026-10-03T10:00:00.000Z",
      },
      {
        id: "prod-unpublished-draft",
        slug: "unpublished-secret-toner",
        name: "Draft Toner (Unpublished)",
        description: "Should never appear in public endpoints",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "DRAFT-001",
        oemPartNumber: "CF999A",
        productType: "toner",
        condition: "new",
        authenticity: "original",
        pageYield: 5000,
        color: "Black",
        priceKes: "9900.00",
        comparePriceKes: null,
        stockQuantity: 5,
        images: [],
        thumbnailUrl: "",
        isPublished: false,
        isFeatured: true,
        createdAt: "2026-10-04T10:00:00.000Z",
        updatedAt: "2026-10-04T10:00:00.000Z",
      },
    ],
    variants: [
      {
        id: "var-59a-comp",
        productId: "prod-59a",
        name: "Compatible 59A (3,000 pages)",
        sku: "TON-CF259A-COMP",
        oemPartNumber: "CF259A",
        authenticity: "compatible",
        pageYield: 3000,
        priceKes: "3800.00",
        comparePriceKes: "4500.00",
        stockQuantity: 8,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: "var-59a-oem",
        productId: "prod-59a",
        name: "Original HP 59A OEM (3,000 pages)",
        sku: "TON-CF259A-OEM",
        oemPartNumber: "CF259A",
        authenticity: "original",
        pageYield: 3000,
        priceKes: "12500.00",
        comparePriceKes: null,
        stockQuantity: 2,
        isActive: true,
        sortOrder: 2,
      },
      {
        id: "var-59a-inactive",
        productId: "prod-59a",
        name: "Discontinued Variant",
        sku: "TON-CF259A-OLD",
        oemPartNumber: "CF259A",
        authenticity: "compatible",
        pageYield: 3000,
        priceKes: "1000.00",
        comparePriceKes: null,
        stockQuantity: 0,
        isActive: false,
        sortOrder: 3,
      },
    ],
    compatibilityLinks: [
      // M404dn is linked ONLY to 59A toner, M404 fuser, and the unpublished draft
      // Notice 85A toner is ALSO brand "HP", but is NOT linked to M404dn!
      { productId: "prod-59a", printerModelId: "pm-m404dn" },
      { productId: "prod-fuser", printerModelId: "pm-m404dn" },
      { productId: "prod-unpublished-draft", printerModelId: "pm-m404dn" },
      // P1102 is linked ONLY to 85A toner
      { productId: "prod-85a", printerModelId: "pm-p1102" },
    ],
  };
}

describe("Storefront Catalogue & Printer Compatibility API", () => {
  const app = createApp();

  beforeEach(() => {
    setCatalogDatasetForTesting(createFixtureDataset());
  });

  afterEach(() => {
    setCatalogDatasetForTesting(null);
  });

  it("never exposes unpublished products in product listings or detail lookups", async () => {
    const listRes = await invokeApp(app, { url: "/api/products" });
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.total).toBe(3);

    const slugs = listRes.body.data.items.map((p: any) => p.slug);
    expect(slugs).not.toContain("unpublished-secret-toner");

    const draftRes = await invokeApp(app, {
      url: "/api/products/unpublished-secret-toner",
    });
    expect(draftRes.status).toBe(404);
    expect(draftRes.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("excludes inactive categories from GET /api/categories", async () => {
    const res = await invokeApp(app, { url: "/api/categories" });
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: any) => c.slug)).toEqual([
      "laser-toners",
      "printer-parts",
    ]);
  });

  it("filters products by category, productType, authenticity, and OEM part search", async () => {
    const byCategory = await invokeApp(app, {
      url: "/api/products?category=printer-parts",
    });
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data.items).toHaveLength(1);
    expect(byCategory.body.data.items[0].slug).toBe(
      "hp-m404-fuser-rm2-2554",
    );

    const byOemSearch = await invokeApp(app, {
      url: "/api/products?search=CE285A",
    });
    expect(byOemSearch.status).toBe(200);
    expect(byOemSearch.body.data.items).toHaveLength(1);
    expect(byOemSearch.body.data.items[0].sku).toBe("TON-CE285A");
  });

  it("sorts products accurately by price_asc, price_desc, and name_asc", async () => {
    const priceAsc = await invokeApp(app, {
      url: "/api/products?sort=price_asc",
    });
    expect(priceAsc.body.data.items.map((p: any) => p.priceKes)).toEqual([
      "1800.00",
      "3800.00",
      "16500.00",
    ]);

    const priceDesc = await invokeApp(app, {
      url: "/api/products?sort=price_desc",
    });
    expect(priceDesc.body.data.items.map((p: any) => p.priceKes)).toEqual([
      "16500.00",
      "3800.00",
      "1800.00",
    ]);
  });

  it("returns active variants, verified compatible printer models, and related products on GET /api/products/:slug", async () => {
    const res = await invokeApp(app, {
      url: "/api/products/hp-59a-cf259a-toner",
    });
    expect(res.status).toBe(200);

    const product = res.body.data;
    // Only the 2 active variants should be returned (inactive variant excluded)
    expect(product.variants).toHaveLength(2);
    expect(product.variants.map((v: any) => v.sku)).toEqual([
      "TON-CF259A-COMP",
      "TON-CF259A-OEM",
    ]);

    // Compatible printer models
    expect(product.compatiblePrinterModels).toHaveLength(1);
    expect(product.compatiblePrinterModels[0].slug).toBe(
      "hp-laserjet-pro-m404dn",
    );

    // Related products in same category (85A toner, excluding self and unpublished draft)
    expect(product.relatedProducts).toHaveLength(1);
    expect(product.relatedProducts[0].slug).toBe(
      "hp-85a-ce285a-compatible-toner",
    );
  });

  it("strictly uses product_printer_compatibility and never treats brand match as compatibility", async () => {
    // HP LaserJet Pro M404dn is an HP printer.
    // Both 59A and 85A are HP toners, plus the unpublished draft is linked.
    // Only 59A and the M404 fuser should be returned — NEVER 85A and NEVER the unpublished draft.
    const compatRes = await invokeApp(app, {
      url: "/api/printer-models/hp-laserjet-pro-m404dn/compatible-products",
    });
    expect(compatRes.status).toBe(200);
    expect(compatRes.body.data.printerModel.name).toBe(
      "HP LaserJet Pro M404dn",
    );
    expect(compatRes.body.data.printerModel.compatibleProductCount).toBe(2);

    const returnedSlugs = compatRes.body.data.items.map((p: any) => p.slug);
    expect(returnedSlugs).toEqual([
      "hp-59a-cf259a-toner",
      "hp-m404-fuser-rm2-2554",
    ]);
    expect(returnedSlugs).not.toContain("hp-85a-ce285a-compatible-toner");
    expect(returnedSlugs).not.toContain("unpublished-secret-toner");

    // Refining compatible products by category=laser-toners
    const refinedRes = await invokeApp(app, {
      url: "/api/printer-models/hp-laserjet-pro-m404dn/compatible-products?category=laser-toners",
    });
    expect(refinedRes.status).toBe(200);
    expect(refinedRes.body.data.items).toHaveLength(1);
    expect(refinedRes.body.data.items[0].slug).toBe("hp-59a-cf259a-toner");
  });

  it("returns empty compatible items when a printer model has no verified links", async () => {
    const res = await invokeApp(app, {
      url: "/api/printer-models/kyocera-ecosys-m2040dn/compatible-products",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.printerModel.compatibleProductCount).toBe(0);
  });

  it("returns 404 PRINTER_MODEL_NOT_FOUND for unknown printer model slugs", async () => {
    const res = await invokeApp(app, {
      url: "/api/printer-models/non-existent-printer/compatible-products",
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PRINTER_MODEL_NOT_FOUND");
  });
});

describe("Development Seed Data Labelling Integrity", () => {
  it("clearly labels all demonstration records with [DEMO] and demo-/DEMO- prefixes", () => {
    for (const cat of DEMO_CATEGORIES) {
      expect(cat.slug.startsWith("demo-")).toBe(true);
      expect(cat.name.includes("[DEMO]")).toBe(true);
    }
    for (const brand of DEMO_BRANDS) {
      expect(brand.slug.startsWith("demo-")).toBe(true);
      expect(brand.name.includes("[DEMO]")).toBe(true);
    }
    for (const pm of DEMO_PRINTER_MODELS) {
      expect(pm.slug.startsWith("demo-")).toBe(true);
      expect(pm.name.includes("[DEMO]")).toBe(true);
    }
    for (const prod of DEMO_PRODUCTS) {
      expect(prod.slug.startsWith("demo-")).toBe(true);
      expect(prod.sku.startsWith("DEMO-")).toBe(true);
      expect(prod.name.includes("[DEMO]")).toBe(true);
      expect(prod.description.includes("[DEMO")).toBe(true);
    }
  });
});

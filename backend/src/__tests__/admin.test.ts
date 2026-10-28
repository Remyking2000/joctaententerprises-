import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import {
  setCatalogDatasetForTesting,
  type CatalogDataset,
} from "../services/catalog.service.js";

async function invokeApp(
  app: express.Express,
  options: { method?: string; url: string; body?: unknown },
): Promise<{
  status: number;
  body: Record<string, any>;
}> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = options.method ?? "GET";
    req.url = options.url;

    const jsonStr =
      options.body !== undefined ? JSON.stringify(options.body) : "";
    const buf = Buffer.from(jsonStr, "utf8");

    req.headers = {
      host: "localhost",
      "content-type": "application/json",
      "content-length": String(buf.length),
    };

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
      if (options.body !== undefined) {
        req.push(buf);
      }
      req.push(null);
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
        id: "cat-printers",
        slug: "printers",
        name: "Printers",
        description: "Laser and ink printers",
        imageUrl: "",
        sortOrder: 2,
        isActive: true,
      },
    ],
    brands: [
      {
        id: "brand-hp",
        slug: "hp",
        name: "HP",
        logoUrl: "/brands/hp.png",
        isActive: true,
      },
      {
        id: "brand-canon",
        slug: "canon",
        name: "Canon",
        logoUrl: "/brands/canon.png",
        isActive: true,
      },
    ],
    printerModels: [
      {
        id: "pm-m404",
        slug: "hp-laserjet-pro-m404dn",
        name: "HP LaserJet Pro M404dn",
        series: "LaserJet Pro",
        brandId: "brand-hp",
      },
    ],
    products: [
      {
        id: "prod-cf259a",
        slug: "hp-59a-cf259a-black-toner",
        name: "HP 59A Black LaserJet Toner Cartridge (CF259A)",
        description: "Standard yield OEM black toner cartridge.",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "CF259A",
        oemPartNumber: "CF259A",
        productType: "toner",
        condition: "new",
        authenticity: "original",
        pageYield: 3000,
        color: "Black",
        priceKes: "14500.00",
        comparePriceKes: "16000.00",
        stockQuantity: 12,
        images: [],
        thumbnailUrl: "",
        isPublished: true,
        isFeatured: true,
        createdAt: "2026-01-01T10:00:00.000Z",
        updatedAt: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "prod-cf259x-draft",
        slug: "hp-59x-cf259x-high-yield-toner",
        name: "HP 59X High Yield Black Toner Cartridge (CF259X)",
        description: "High yield draft cartridge.",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "CF259X",
        oemPartNumber: "CF259X",
        productType: "toner",
        condition: "new",
        authenticity: "original",
        pageYield: 10000,
        color: "Black",
        priceKes: "24500.00",
        comparePriceKes: null,
        stockQuantity: 5,
        images: [],
        thumbnailUrl: "",
        isPublished: false,
        isFeatured: false,
        createdAt: "2026-01-02T10:00:00.000Z",
        updatedAt: "2026-01-02T10:00:00.000Z",
      },
    ],
    variants: [],
    compatibilityLinks: [
      { productId: "prod-cf259a", printerModelId: "pm-m404" },
    ],
  };
}

describe("Admin API Foundation (Phase 1)", () => {
  let app: express.Express;

  beforeEach(() => {
    setCatalogDatasetForTesting(createFixtureDataset());
    app = createApp();
  });

  afterEach(() => {
    setCatalogDatasetForTesting(null);
  });

  describe("GET /api/admin/stats", () => {
    it("returns accurate real counts for products, published status, categories, brands, and models", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        totalProducts: 2,
        publishedProducts: 1,
        unpublishedProducts: 1,
        totalCategories: 2,
        totalBrands: 2,
        totalPrinterModels: 1,
        storageMode: "memory",
      });
    });
  });

  describe("GET /api/admin/products", () => {
    it("lists all products including unpublished drafts", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/products",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.items).toHaveLength(2);
      const skus = res.body.data.items.map((i: any) => i.sku);
      expect(skus).toContain("CF259A");
      expect(skus).toContain("CF259X");
    });

    it("filters products by published status", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/products?isPublished=false",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].sku).toBe("CF259X");
    });

    it("searches products by SKU or name", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/products?search=CF259A",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].sku).toBe("CF259A");
    });
  });

  describe("POST /api/admin/products", () => {
    it("creates a new product with valid data", async () => {
      const newProduct = {
        name: "Kyocera TK-1170 Black Toner Cartridge",
        slug: "kyocera-tk-1170-black-toner",
        description: "Genuine Kyocera TK-1170 toner",
        categoryId: "cat-toners",
        brandId: "brand-hp",
        sku: "TK-1170",
        oemPartNumber: "TK1170",
        productType: "toner",
        condition: "new",
        authenticity: "original",
        pageYield: 7200,
        priceKes: "8500.00",
        comparePriceKes: "9200.00",
        stockQuantity: 15,
        isPublished: true,
        isFeatured: false,
      };

      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/products",
        body: newProduct,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sku).toBe("TK-1170");
      expect(res.body.data.priceKes).toBe("8500.00");

      // Verify stats reflect the new product
      const statsRes = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
      });
      expect(statsRes.body.data.totalProducts).toBe(3);
      expect(statsRes.body.data.publishedProducts).toBe(2);
    });

    it("rejects product with duplicate slug", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/products",
        body: {
          name: "Duplicate Toner",
          slug: "hp-59a-cf259a-black-toner", // already exists
          categoryId: "cat-toners",
          sku: "CF259A-NEW",
          priceKes: "12000.00",
        },
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DUPLICATE_SLUG");
    });

    it("rejects product with duplicate SKU", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/products",
        body: {
          name: "Different Slug Same SKU",
          slug: "different-slug-unique",
          categoryId: "cat-toners",
          sku: "CF259A", // already exists
          priceKes: "12000.00",
        },
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DUPLICATE_SKU");
    });

    it("rejects product with negative price via server-side validation", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/products",
        body: {
          name: "Invalid Negative Price",
          slug: "negative-price-test",
          categoryId: "cat-toners",
          sku: "TEST-NEG",
          priceKes: "-500.00",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/admin/products/:id", () => {
    it("updates product fields", async () => {
      const res = await invokeApp(app, {
        method: "PUT",
        url: "/api/admin/products/prod-cf259a",
        body: {
          name: "HP 59A Black Toner Cartridge - Updated",
          priceKes: "14999.00",
          stockQuantity: 20,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("HP 59A Black Toner Cartridge - Updated");
      expect(res.body.data.priceKes).toBe("14999.00");
      expect(res.body.data.stockQuantity).toBe(20);
    });
  });

  describe("PATCH /api/admin/products/:id/publish", () => {
    it("publishes an unpublished draft and unpublishes an active product", async () => {
      // 1. Publish draft
      const pubRes = await invokeApp(app, {
        method: "PATCH",
        url: "/api/admin/products/prod-cf259x-draft/publish",
        body: { isPublished: true },
      });

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.isPublished).toBe(true);

      // Verify storefront now returns it
      const storeRes = await invokeApp(app, {
        method: "GET",
        url: "/api/products/hp-59x-cf259x-high-yield-toner",
      });
      expect(storeRes.status).toBe(200);
      expect(storeRes.body.data.slug).toBe("hp-59x-cf259x-high-yield-toner");

      // 2. Unpublish it
      const unpubRes = await invokeApp(app, {
        method: "PATCH",
        url: "/api/admin/products/prod-cf259x-draft/publish",
        body: { isPublished: false },
      });
      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.data.isPublished).toBe(false);

      // Storefront now returns 404 for unpublished product
      const storeResAfter = await invokeApp(app, {
        method: "GET",
        url: "/api/products/hp-59x-cf259x-high-yield-toner",
      });
      expect(storeResAfter.status).toBe(404);
    });
  });

  describe("Categories & Brands administration", () => {
    it("creates and updates a category", async () => {
      const catRes = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/categories",
        body: {
          name: "Drum Units",
          slug: "drum-units",
          description: "Photoreceptor imaging drums",
          sortOrder: 3,
        },
      });

      expect(catRes.status).toBe(201);
      expect(catRes.body.data.slug).toBe("drum-units");

      const updateCatRes = await invokeApp(app, {
        method: "PUT",
        url: `/api/admin/categories/${catRes.body.data.id}`,
        body: {
          description: "Updated imaging drums description",
        },
      });
      expect(updateCatRes.status).toBe(200);
      expect(updateCatRes.body.data.description).toBe(
        "Updated imaging drums description",
      );
    });

    it("creates and updates a brand", async () => {
      const brandRes = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/brands",
        body: {
          name: "Epson",
          slug: "epson",
          logoUrl: "/brands/epson.png",
        },
      });

      expect(brandRes.status).toBe(201);
      expect(brandRes.body.data.name).toBe("Epson");

      const updateBrandRes = await invokeApp(app, {
        method: "PUT",
        url: `/api/admin/brands/${brandRes.body.data.id}`,
        body: {
          logoUrl: "/brands/epson-updated.png",
        },
      });
      expect(updateBrandRes.status).toBe(200);
      expect(updateBrandRes.body.data.logoUrl).toBe(
        "/brands/epson-updated.png",
      );
    });

    it("resets demo data cleanly via POST /api/admin/demo/reset", async () => {
      const resetRes = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/demo/reset",
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.data.totalProducts).toBe(2);
      expect(resetRes.body.data.publishedProducts).toBe(1);
    });
  });
});

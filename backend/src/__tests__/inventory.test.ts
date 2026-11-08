import type express from "express";
import type { ProductSummary, StockItem } from "@jocta/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import {
  setCatalogDatasetForTesting,
  type CatalogDataset,
} from "../services/catalog.service.js";
import { invokeApp } from "./helpers/http.js";

function product(overrides: Partial<ProductSummary> & Pick<ProductSummary, "id" | "sku" | "name">): ProductSummary {
  return {
    slug: overrides.id,
    description: "",
    categoryId: "cat-toners",
    brandId: "brand-hp",
    oemPartNumber: overrides.sku,
    productType: "toner",
    condition: "new",
    authenticity: "original",
    pageYield: null,
    color: null,
    priceKes: "1000.00",
    comparePriceKes: null,
    stockQuantity: 0,
    images: [],
    thumbnailUrl: "",
    isPublished: true,
    isFeatured: false,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * - HP 26A: a plain product, 10 on hand at KSh 8,000.
 * - HP 85A: sold as two variants — Original (5 @ 6,000) and Compatible (8 @ 1,800).
 */
function fixture(): CatalogDataset {
  return {
    categories: [
      {
        id: "cat-toners",
        slug: "laser-toners",
        name: "Laser Toners",
        description: "",
        imageUrl: "",
        sortOrder: 1,
        isActive: true,
      },
    ],
    brands: [{ id: "brand-hp", slug: "hp", name: "HP", logoUrl: "", isActive: true }],
    printerModels: [],
    products: [
      product({ id: "p-26a", sku: "CF226A", name: "HP 26A Toner", priceKes: "8000.00", stockQuantity: 10 }),
      product({ id: "p-85a", sku: "CE285A", name: "HP 85A Toner", priceKes: "6000.00", stockQuantity: 13 }),
    ],
    variants: [
      {
        id: "v-85a-orig",
        productId: "p-85a",
        name: "Original",
        sku: "CE285A-OEM",
        oemPartNumber: "CE285A",
        authenticity: "original",
        pageYield: 1600,
        priceKes: "6000.00",
        comparePriceKes: null,
        stockQuantity: 5,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: "v-85a-comp",
        productId: "p-85a",
        name: "Compatible",
        sku: "CE285A-COMP",
        oemPartNumber: "CE285A",
        authenticity: "compatible",
        pageYield: 1600,
        priceKes: "1800.00",
        comparePriceKes: null,
        stockQuantity: 8,
        isActive: true,
        sortOrder: 1,
      },
    ],
    compatibilityLinks: [],
  };
}

const API = "/api/admin/inventory";
const P26A = { productId: "p-26a" };
const ORIGINAL = { productId: "p-85a", variantId: "v-85a-orig" };
const COMPATIBLE = { productId: "p-85a", variantId: "v-85a-comp" };

describe("Inventory API", () => {
  let app: express.Express;
  let dataset: CatalogDataset;

  beforeEach(() => {
    dataset = fixture();
    setCatalogDatasetForTesting(dataset);
    app = createApp();
  });

  afterEach(() => {
    setCatalogDatasetForTesting(null);
  });

  async function items(): Promise<Record<string, StockItem>> {
    const res = await invokeApp(app, { url: `${API}/items` });
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.data as StockItem[]).map((i) => [i.key, i]));
  }

  async function movements(query = "") {
    const res = await invokeApp(app, { url: `${API}/movements${query}` });
    expect(res.status).toBe(200);
    return res.body.data as Array<Record<string, any>>;
  }

  it("requires an administrator session", async () => {
    const res = await invokeApp(app, { url: `${API}/items`, cookie: null });
    expect(res.status).toBe(401);
  });

  it("lists one stock item per plain product and per variant, with opening balances", async () => {
    const all = await items();
    expect(Object.keys(all).sort()).toEqual(["p-26a", "p-85a::v-85a-comp", "p-85a::v-85a-orig"]);
    expect(all["p-85a::v-85a-orig"]).toMatchObject({
      productName: "HP 85A Toner",
      variantName: "Original",
      stockQuantity: 5,
      reorderLevel: 3,
      costPriceKes: null,
      status: "in_stock",
    });

    const opening = await movements("?reason=opening");
    expect(opening).toHaveLength(3);
    expect(opening.reduce((sum, m) => sum + m.delta, 0)).toBe(23);
  });

  it("receives stock on one item, records the cost and writes a ledger row", async () => {
    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/adjust`,
      body: { ...P26A, reason: "receive", delta: 5, unitCostKes: "5200", note: "Delivery" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.item).toMatchObject({ stockQuantity: 15, costPriceKes: "5200.00" });
    expect(res.body.data.movement).toMatchObject({
      delta: 5,
      balanceAfter: 15,
      reason: "receive",
      unitCostKes: "5200.00",
      userEmail: "ycremy2000@gmail.com",
    });
    expect(dataset.products.find((p) => p.id === "p-26a")?.stockQuantity).toBe(15);
  });

  it("refuses to take stock below zero or move it the wrong way for the reason", async () => {
    const tooMany = await invokeApp(app, {
      method: "POST",
      url: `${API}/adjust`,
      body: { ...P26A, reason: "damage", delta: -11 },
    });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_STOCK");

    const wrongWay = await invokeApp(app, {
      method: "POST",
      url: `${API}/adjust`,
      body: { ...P26A, reason: "receive", delta: -2 },
    });
    expect(wrongWay.status).toBe(400);

    expect((await items())["p-26a"].stockQuantity).toBe(10);
  });

  it("asks for a variant when a product has them", async () => {
    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/adjust`,
      body: { productId: "p-85a", reason: "receive", delta: 1 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VARIANT_REQUIRED");
  });

  it("receives a multi-line delivery under one reference and keeps the product total in sync", async () => {
    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/receive`,
      body: {
        supplierReference: "INV-4471",
        lines: [
          { ...ORIGINAL, quantity: 2, unitCostKes: "4100" },
          { ...P26A, quantity: 4 },
        ],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^RCV-\d{8}-[0-9A-F]{4}$/);
    expect(res.body.data.applied).toBe(2);

    const all = await items();
    expect(all["p-85a::v-85a-orig"]).toMatchObject({ stockQuantity: 7, costPriceKes: "4100.00" });
    expect(all["p-26a"].stockQuantity).toBe(14);
    // Product row holds the total of its variants: 7 Original + 8 Compatible.
    expect(dataset.products.find((p) => p.id === "p-85a")?.stockQuantity).toBe(15);

    const batch = await movements(`?reference=${res.body.data.reference}`);
    expect(batch).toHaveLength(2);
    expect(batch.every((m) => m.note.includes("INV-4471"))).toBe(true);
  });

  it("commits a stock take, writing rows only for counts that differ", async () => {
    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/stock-take`,
      body: {
        counts: [
          { ...P26A, countedQuantity: 10 },
          { ...COMPATIBLE, countedQuantity: 6 },
        ],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ applied: 1, unchanged: 1 });
    expect(res.body.data.movements[0]).toMatchObject({
      reason: "stock_take",
      delta: -2,
      balanceAfter: 6,
    });
    expect((await items())["p-85a::v-85a-comp"].stockQuantity).toBe(6);
  });

  it("records a sale, deducts stock and reports profit from recorded costs", async () => {
    await invokeApp(app, {
      method: "PATCH",
      url: `${API}/settings`,
      body: { ...P26A, costPriceKes: "5000" },
    });

    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/sales`,
      body: {
        channel: "whatsapp",
        paymentMethod: "mpesa",
        customerName: "Acme Ltd",
        lines: [
          { ...P26A, quantity: 2, unitPriceKes: "7500" },
          { ...COMPATIBLE, quantity: 3 },
        ],
      },
    });
    expect(res.status).toBe(201);
    const sale = res.body.data;
    expect(sale.reference).toMatch(/^SALE-/);
    // List value 2 × 8,000 + 3 × 1,800 = 21,400; charged 2 × 7,500 + 3 × 1,800 = 20,400.
    expect(sale).toMatchObject({
      subtotalKes: "21400.00",
      totalKes: "20400.00",
      discountKes: "1000.00",
      status: "completed",
    });

    const all = await items();
    expect(all["p-26a"].stockQuantity).toBe(8);
    expect(all["p-85a::v-85a-comp"].stockQuantity).toBe(5);

    const report = await invokeApp(app, { url: `${API}/sales/report` });
    expect(report.status).toBe(200);
    expect(report.body.data.summary).toMatchObject({
      revenueKes: "20400.00",
      transactions: 1,
      unitsSold: 5,
      // Only the HP 26A line has a cost: 15,000 − 2 × 5,000.
      costedRevenueKes: "15000.00",
      grossProfitKes: "5000.00",
    });
    expect(
      report.body.data.byChannel.find((c: any) => c.channel === "whatsapp").revenueKes,
    ).toBe("20400.00");
  });

  it("rejects a sale that would oversell and leaves every line untouched", async () => {
    const res = await invokeApp(app, {
      method: "POST",
      url: `${API}/sales`,
      body: {
        lines: [
          { ...P26A, quantity: 1 },
          { ...ORIGINAL, quantity: 6 },
        ],
      },
    });
    expect(res.status).toBe(409);
    const all = await items();
    expect(all["p-26a"].stockQuantity).toBe(10);
    expect(all["p-85a::v-85a-orig"].stockQuantity).toBe(5);
    expect(await movements("?reason=sale")).toHaveLength(0);
  });

  it("voids a sale once, returning its stock to the shelf", async () => {
    const created = await invokeApp(app, {
      method: "POST",
      url: `${API}/sales`,
      body: { lines: [{ ...ORIGINAL, quantity: 2 }] },
    });
    const id = created.body.data.id;
    expect((await items())["p-85a::v-85a-orig"].stockQuantity).toBe(3);

    const voided = await invokeApp(app, {
      method: "POST",
      url: `${API}/sales/${id}/void`,
      body: { reason: "Customer changed their mind" },
    });
    expect(voided.status).toBe(200);
    expect(voided.body.data).toMatchObject({ status: "voided", voidReason: "Customer changed their mind" });
    expect((await items())["p-85a::v-85a-orig"].stockQuantity).toBe(5);
    expect(await movements("?reason=sale_void")).toHaveLength(1);

    const again = await invokeApp(app, {
      method: "POST",
      url: `${API}/sales/${id}/void`,
      body: { reason: "Second attempt" },
    });
    expect(again.status).toBe(409);
  });

  it("flags low stock from the item's reorder level", async () => {
    const res = await invokeApp(app, {
      method: "PATCH",
      url: `${API}/settings`,
      body: { ...COMPATIBLE, reorderLevel: 10 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ reorderLevel: 10, status: "low_stock" });

    const dashboard = await invokeApp(app, { url: `${API}/dashboard` });
    expect(dashboard.body.data.stats).toMatchObject({ lowStock: 1, totalItems: 3, totalUnits: 23 });
    expect(dashboard.body.data.lowStockItems.map((i: StockItem) => i.key)).toEqual([
      "p-85a::v-85a-comp",
    ]);
  });

  it("records stock edited on the product form as a correction", async () => {
    const res = await invokeApp(app, {
      method: "PUT",
      url: "/api/admin/products/p-26a",
      body: { stockQuantity: 7 },
    });
    expect(res.status).toBe(200);

    const corrections = await movements("?reason=correction");
    expect(corrections).toHaveLength(1);
    expect(corrections[0]).toMatchObject({ delta: -3, balanceAfter: 7, productId: "p-26a" });
  });

  it("never exposes cost prices on the public catalogue", async () => {
    await invokeApp(app, {
      method: "PATCH",
      url: `${API}/settings`,
      body: { ...P26A, costPriceKes: "5000" },
    });
    const res = await invokeApp(app, { url: "/api/products/p-26a", cookie: null });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("5000");
    expect(JSON.stringify(res.body)).not.toMatch(/cost/i);
  });
});

describe("Admin and inventory stay in step", () => {
  let app: express.Express;
  let dataset: CatalogDataset;

  beforeEach(() => {
    dataset = fixture();
    setCatalogDatasetForTesting(dataset);
    app = createApp();
  });

  afterEach(() => {
    setCatalogDatasetForTesting(null);
  });

  it("keeps a product's total equal to its options when the admin form sends a different total", async () => {
    const res = await invokeApp(app, {
      method: "PUT",
      url: "/api/admin/products/p-85a",
      body: { stockQuantity: 999 },
    });
    expect(res.status).toBe(200);
    // 5 Original + 8 Compatible, not the 999 typed on the form
    expect(res.body.data.stockQuantity).toBe(13);
    expect(dataset.products.find((p) => p.id === "p-85a")?.stockQuantity).toBe(13);
  });

  it("shows stock changed on the admin form in inventory, and inventory changes on the admin product", async () => {
    await invokeApp(app, {
      method: "PUT",
      url: "/api/admin/products/p-26a",
      body: { stockQuantity: 4 },
    });
    const items = await invokeApp(app, { url: `${API}/items` });
    expect(items.body.data.find((i: StockItem) => i.key === "p-26a").stockQuantity).toBe(4);

    await invokeApp(app, {
      method: "POST",
      url: `${API}/adjust`,
      body: { ...P26A, reason: "receive", delta: 6 },
    });
    const product = await invokeApp(app, { url: "/api/admin/products/p-26a" });
    expect(product.body.data.stockQuantity).toBe(10);
  });

  it("lists a product created in admin as a stock item, and drops it when deleted", async () => {
    const created = await invokeApp(app, {
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: "Canon 052 Toner",
        slug: "canon-052-toner",
        sku: "JOC-TON-052",
        categoryId: "cat-toners",
        priceKes: "9500",
        stockQuantity: 3,
      },
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    let items = await invokeApp(app, { url: `${API}/items` });
    expect(items.body.data.some((i: StockItem) => i.productId === id && i.stockQuantity === 3)).toBe(true);

    await invokeApp(app, { method: "DELETE", url: `/api/admin/products/${id}` });
    items = await invokeApp(app, { url: `${API}/items` });
    expect(items.body.data.some((i: StockItem) => i.productId === id)).toBe(false);
  });
});

import type { Sale } from "@jocta/shared";
import { describe, expect, it } from "vitest";
import {
  buildActivity,
  buildSalesReport,
  dateRangeToInstants,
  fromCents,
  monthRange,
  nairobiDate,
  resolveAdjustment,
  stockStatus,
  toCents,
} from "../services/inventory.logic.js";

describe("inventory rules", () => {
  it("handles money in cents without float drift", () => {
    expect(toCents("1250.50")).toBe(125050);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(125050)).toBe("1250.50");
    expect(toCents(null)).toBe(0);
  });

  it("buckets days in Nairobi time (UTC+3)", () => {
    // 22:30 UTC on 31 Oct is already 1 Nov in Nairobi.
    expect(nairobiDate("2026-10-31T22:30:00.000Z")).toBe("2026-11-01");
    expect(nairobiDate("2026-10-31T20:59:59.000Z")).toBe("2026-10-31");

    const { start, end } = dateRangeToInstants("2026-11-01", "2026-11-30");
    expect(start.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T21:00:00.000Z");
  });

  it("knows how long each month is", () => {
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange(undefined, new Date("2026-11-30T22:00:00Z"))).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("resolves relative and absolute adjustments and blocks negative stock", () => {
    expect(resolveAdjustment(10, { delta: -4 }, "X")).toEqual({ delta: -4, next: 6 });
    expect(resolveAdjustment(10, { newQuantity: 3 }, "X")).toEqual({ delta: -7, next: 3 });
    expect(() => resolveAdjustment(2, { delta: -3 }, "HP 26A")).toThrow(
      /HP 26A has 2 in stock/,
    );
  });

  it("classifies stock status against the reorder level", () => {
    expect(stockStatus(0, 3)).toBe("out_of_stock");
    expect(stockStatus(3, 3)).toBe("low_stock");
    expect(stockStatus(4, 3)).toBe("in_stock");
  });

  it("builds a daily in/out series with quiet days included", () => {
    const points = buildActivity(
      [
        { delta: 5, createdAt: "2026-11-05T08:00:00.000Z" },
        { delta: -2, createdAt: "2026-11-05T09:00:00.000Z" },
        { delta: 9, createdAt: "2026-10-01T09:00:00.000Z" },
      ],
      3,
      new Date("2026-11-05T12:00:00.000Z"),
    );
    expect(points).toEqual([
      { date: "2026-11-03", unitsIn: 0, unitsOut: 0 },
      { date: "2026-11-04", unitsIn: 0, unitsOut: 0 },
      { date: "2026-11-05", unitsIn: 5, unitsOut: 2 },
    ]);
  });

  it("summarises completed sales only, with profit from costed lines", () => {
    const line = {
      id: "l1",
      productId: "p1",
      variantId: null,
      productName: "HP 26A",
      variantName: null,
      sku: "CF226A",
      quantity: 2,
      listPriceKes: "8000.00",
      unitPriceKes: "7500.00",
      unitCostKes: "5000.00",
      lineTotalKes: "15000.00",
    };
    const sale = (id: string, status: Sale["status"], createdAt: string): Sale => ({
      id,
      reference: id,
      channel: "walk_in",
      paymentMethod: "mpesa",
      customerName: "",
      customerPhone: "",
      note: "",
      status,
      subtotalKes: "16000.00",
      discountKes: "1000.00",
      totalKes: "15000.00",
      createdBy: "",
      createdAt,
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
      lines: [line],
    });

    const report = buildSalesReport(
      [
        sale("a", "completed", "2026-11-02T07:00:00.000Z"),
        sale("b", "voided", "2026-11-02T08:00:00.000Z"),
      ],
      "2026-11-01",
      "2026-11-03",
    );
    expect(report.summary).toMatchObject({
      revenueKes: "15000.00",
      grossProfitKes: "5000.00",
      transactions: 1,
      voidedTransactions: 1,
      averageSaleKes: "15000.00",
      discountKes: "1000.00",
    });
    expect(report.byPaymentMethod.find((p) => p.paymentMethod === "mpesa")?.revenueKes).toBe(
      "15000.00",
    );
    expect(report.daily.map((d) => d.revenueKes)).toEqual(["0.00", "15000.00", "0.00"]);
    expect(report.topProducts[0]).toMatchObject({ name: "HP 26A", quantity: 2, grossProfitKes: "5000.00" });
  });
});

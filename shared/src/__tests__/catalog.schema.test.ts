import { describe, expect, it } from "vitest";
import {
  kesMoneySchema,
  productListQuerySchema,
  slugParamSchema,
} from "../catalog.schema.js";

describe("Shared Catalog Schemas", () => {
  it("normalizes and validates KES monetary amounts safely", () => {
    expect(kesMoneySchema.parse(3500)).toBe("3500.00");
    expect(kesMoneySchema.parse("4250.5")).toBe("4250.5");
    expect(kesMoneySchema.parse("12999.99")).toBe("12999.99");

    expect(() => kesMoneySchema.parse("-100")).toThrow();
    expect(() => kesMoneySchema.parse("100.999")).toThrow();
    expect(() => kesMoneySchema.parse("abc")).toThrow();
  });

  it("validates product list query filters", () => {
    const parsed = productListQuerySchema.parse({
      productType: "toner",
      authenticity: "original",
      printerModel: "hp-laserjet-pro-m404dn",
      page: "2",
      limit: "12",
    });

    expect(parsed.productType).toBe("toner");
    expect(parsed.authenticity).toBe("original");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(12);
  });

  it("rejects invalid product types and out-of-range pagination", () => {
    expect(() =>
      productListQuerySchema.parse({ productType: "footwear" }),
    ).toThrow();
    expect(() => productListQuerySchema.parse({ limit: "500" })).toThrow();
  });

  it("validates product slugs", () => {
    expect(slugParamSchema.parse({ slug: "hp-85a-black-toner-ce285a" })).toEqual({
      slug: "hp-85a-black-toner-ce285a",
    });
    expect(() => slugParamSchema.parse({ slug: "Invalid Slug!" })).toThrow();
  });
});

/**
 * Repeatable, idempotent development seed script for Jocta Enterprises.
 *
 * IMPORTANT RULES:
 * 1. All records created by this script are explicitly prefixed with `[DEMO]`
 *    in their display names/descriptions and `demo-` / `DEMO-` in slugs and SKUs.
 * 2. Prices, stock quantities, and compatibility mappings in this file are
 *    DEMONSTRATION DATA ONLY and must not be treated as verified client pricing.
 * 3. Uses `ON CONFLICT DO NOTHING` so existing records or real client data are
 *    NEVER overwritten when the script is re-run.
 * 4. Refuses to run when `NODE_ENV === "production"` unless `--allow-production-demo`
 *    is explicitly passed on the command line.
 * 5. Pass `--clean` (`npm run db:seed:clean`) to safely remove only `demo-*` /
 *    `DEMO-*` records without touching any real client records.
 */

import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { closeDb, getPool } from "../config/db.js";

export const DEMO_CATEGORIES = [
  {
    slug: "demo-laser-toners",
    name: "Laser Toner Cartridges [DEMO]",
    description:
      "[DEMO] Demonstration category for monochrome and color laser toner cartridges.",
    sortOrder: 1,
  },
  {
    slug: "demo-drum-units",
    name: "Drum & Imaging Units [DEMO]",
    description:
      "[DEMO] Demonstration category for replacement drum units and imaging kits.",
    sortOrder: 2,
  },
  {
    slug: "demo-printer-parts",
    name: "Printer Spare Parts [DEMO]",
    description:
      "[DEMO] Demonstration category for fuser assemblies, pickup rollers, and maintenance kits.",
    sortOrder: 3,
  },
  {
    slug: "demo-ink-consumables",
    name: "Ink Bottles & Consumables [DEMO]",
    description:
      "[DEMO] Demonstration category for continuous ink tank bottles and cartridges.",
    sortOrder: 4,
  },
  {
    slug: "demo-printers",
    name: "Office Printers [DEMO]",
    description:
      "[DEMO] Secondary demonstration category for laser and ink tank office printers.",
    sortOrder: 5,
  },
] as const;

export const DEMO_BRANDS = [
  { slug: "demo-hp", name: "HP [DEMO]" },
  { slug: "demo-kyocera", name: "Kyocera [DEMO]" },
  { slug: "demo-canon", name: "Canon [DEMO]" },
  { slug: "demo-brother", name: "Brother [DEMO]" },
  { slug: "demo-epson", name: "Epson [DEMO]" },
] as const;

export const DEMO_PRINTER_MODELS = [
  {
    slug: "demo-hp-laserjet-pro-m404dn",
    brandSlug: "demo-hp",
    name: "HP LaserJet Pro M404dn [DEMO]",
    series: "LaserJet Pro M404 Series",
  },
  {
    slug: "demo-hp-laserjet-pro-mfp-m428fdw",
    brandSlug: "demo-hp",
    name: "HP LaserJet Pro MFP M428fdw [DEMO]",
    series: "LaserJet Pro M428 Series",
  },
  {
    slug: "demo-hp-laserjet-p1102",
    brandSlug: "demo-hp",
    name: "HP LaserJet Pro P1102 [DEMO]",
    series: "LaserJet P1100 Series",
  },
  {
    slug: "demo-kyocera-ecosys-m2040dn",
    brandSlug: "demo-kyocera",
    name: "Kyocera ECOSYS M2040dn [DEMO]",
    series: "ECOSYS M2040 Series",
  },
  {
    slug: "demo-brother-hl-l2360dn",
    brandSlug: "demo-brother",
    name: "Brother HL-L2360DN [DEMO]",
    series: "HL-L2300 Series",
  },
  {
    slug: "demo-epson-ecotank-l3250",
    brandSlug: "demo-epson",
    name: "Epson EcoTank L3250 [DEMO]",
    series: "EcoTank L3000 Series",
  },
] as const;

export const DEMO_PRODUCTS = [
  {
    slug: "demo-hp-59a-cf259a-black-toner",
    name: "[DEMO] HP 59A (CF259A) Black LaserJet Toner Cartridge",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample monochrome laser toner cartridge with selectable Original OEM and Compatible options for demonstration.",
    categorySlug: "demo-laser-toners",
    brandSlug: "demo-hp",
    sku: "DEMO-TON-CF259A",
    oemPartNumber: "CF259A",
    productType: "toner",
    condition: "new",
    authenticity: "both",
    pageYield: 3000,
    color: "Black",
    priceKes: "3800.00",
    comparePriceKes: "4500.00",
    stockQuantity: 18,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: [
      "demo-hp-laserjet-pro-m404dn",
      "demo-hp-laserjet-pro-mfp-m428fdw",
    ],
    variants: [
      {
        name: "[DEMO] Compatible Standard Yield (3,000 pages)",
        sku: "DEMO-TON-CF259A-COMP",
        oemPartNumber: "CF259A",
        authenticity: "compatible",
        pageYield: 3000,
        priceKes: "3800.00",
        comparePriceKes: "4500.00",
        stockQuantity: 14,
        sortOrder: 1,
      },
      {
        name: "[DEMO] Original HP 59A OEM Standard Yield (3,000 pages)",
        sku: "DEMO-TON-CF259A-OEM",
        oemPartNumber: "CF259A",
        authenticity: "original",
        pageYield: 3000,
        priceKes: "12500.00",
        comparePriceKes: null,
        stockQuantity: 4,
        sortOrder: 2,
      },
      {
        name: "[DEMO] Compatible 59X High Yield (10,000 pages)",
        sku: "DEMO-TON-CF259X-COMP",
        oemPartNumber: "CF259X",
        authenticity: "compatible",
        pageYield: 10000,
        priceKes: "6200.00",
        comparePriceKes: "7000.00",
        stockQuantity: 6,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "demo-hp-85a-ce285a-compatible-toner",
    name: "[DEMO] 85A (CE285A) Compatible Black Toner Cartridge",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample everyday compatible black laser toner cartridge for demonstration purposes.",
    categorySlug: "demo-laser-toners",
    brandSlug: "demo-hp",
    sku: "DEMO-TON-CE285A",
    oemPartNumber: "CE285A",
    productType: "toner",
    condition: "new",
    authenticity: "compatible",
    pageYield: 1600,
    color: "Black",
    priceKes: "1800.00",
    comparePriceKes: "2200.00",
    stockQuantity: 25,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: ["demo-hp-laserjet-p1102"],
    variants: [],
  },
  {
    slug: "demo-kyocera-tk-1170-toner-kit",
    name: "[DEMO] Kyocera TK-1170 Black Toner Kit",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample high-capacity monochrome toner kit for ECOSYS office series.",
    categorySlug: "demo-laser-toners",
    brandSlug: "demo-kyocera",
    sku: "DEMO-TON-TK1170",
    oemPartNumber: "TK-1170",
    productType: "toner",
    condition: "new",
    authenticity: "both",
    pageYield: 7200,
    color: "Black",
    priceKes: "4200.00",
    comparePriceKes: null,
    stockQuantity: 12,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: ["demo-kyocera-ecosys-m2040dn"],
    variants: [
      {
        name: "[DEMO] Compatible TK-1170 Toner (7,200 pages)",
        sku: "DEMO-TON-TK1170-COMP",
        oemPartNumber: "TK-1170",
        authenticity: "compatible",
        pageYield: 7200,
        priceKes: "4200.00",
        comparePriceKes: null,
        stockQuantity: 9,
        sortOrder: 1,
      },
      {
        name: "[DEMO] Original Kyocera TK-1170 OEM Toner (7,200 pages)",
        sku: "DEMO-TON-TK1170-OEM",
        oemPartNumber: "TK-1170",
        authenticity: "original",
        pageYield: 7200,
        priceKes: "11800.00",
        comparePriceKes: null,
        stockQuantity: 3,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "demo-brother-dr-2305-drum-unit",
    name: "[DEMO] Brother DR-2305 Replacement Drum Unit",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample replacement optical imaging drum unit rated at 12,000 pages.",
    categorySlug: "demo-drum-units",
    brandSlug: "demo-brother",
    sku: "DEMO-DRM-DR2305",
    oemPartNumber: "DR-2305",
    productType: "drum",
    condition: "new",
    authenticity: "compatible",
    pageYield: 12000,
    color: "Black",
    priceKes: "3200.00",
    comparePriceKes: "3800.00",
    stockQuantity: 8,
    isPublished: true,
    isFeatured: false,
    compatibleModelSlugs: ["demo-brother-hl-l2360dn"],
    variants: [],
  },
  {
    slug: "demo-hp-m404-fuser-unit-rm2-2554",
    name: "[DEMO] 220V Fuser Assembly Unit (RM2-2554) for LaserJet M404/M428",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample replacement 220V fuser assembly spare part for office laser printers.",
    categorySlug: "demo-printer-parts",
    brandSlug: "demo-hp",
    sku: "DEMO-PRT-RM22554",
    oemPartNumber: "RM2-2554",
    productType: "printer_part",
    condition: "new",
    authenticity: "original",
    pageYield: null,
    color: null,
    priceKes: "16500.00",
    comparePriceKes: null,
    stockQuantity: 4,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: [
      "demo-hp-laserjet-pro-m404dn",
      "demo-hp-laserjet-pro-mfp-m428fdw",
    ],
    variants: [],
  },
  {
    slug: "demo-epson-103-ecotank-ink-bottle-set",
    name: "[DEMO] Epson 103 EcoTank 4-Color Ink Bottle Set (C13T00S14A)",
    description:
      "[DEMO DATA — Unverified sample price & compatibility] Sample 4-color refill ink bottle pack (Black, Cyan, Magenta, Yellow) for EcoTank series.",
    categorySlug: "demo-ink-consumables",
    brandSlug: "demo-epson",
    sku: "DEMO-INK-EPS103-SET",
    oemPartNumber: "C13T00S14A",
    productType: "ink",
    condition: "new",
    authenticity: "original",
    pageYield: 4500,
    color: "Multi-Color (BK/C/M/Y)",
    priceKes: "3600.00",
    comparePriceKes: "4000.00",
    stockQuantity: 15,
    isPublished: true,
    isFeatured: false,
    compatibleModelSlugs: ["demo-epson-ecotank-l3250"],
    variants: [],
  },
  {
    slug: "demo-kyocera-ecosys-m2040dn-mfp-printer",
    name: "[DEMO] Kyocera ECOSYS M2040dn Monochrome Multifunction Laser Printer",
    description:
      "[DEMO DATA — Unverified sample price] Sample secondary-category monochrome A4 multifunction office printer (Print, Copy, Color Scan, Duplex).",
    categorySlug: "demo-printers",
    brandSlug: "demo-kyocera",
    sku: "DEMO-PRN-M2040DN",
    oemPartNumber: "1102S33NL0",
    productType: "printer",
    condition: "new",
    authenticity: "original",
    pageYield: null,
    color: "Monochrome",
    priceKes: "58000.00",
    comparePriceKes: "62000.00",
    stockQuantity: 2,
    isPublished: true,
    isFeatured: false,
    compatibleModelSlugs: ["demo-kyocera-ecosys-m2040dn"],
    variants: [],
  },
] as const;

export async function cleanDemoData() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const delProducts = await client.query(
      "DELETE FROM products WHERE slug LIKE 'demo-%' OR sku LIKE 'DEMO-%'",
    );
    const delModels = await client.query(
      "DELETE FROM printer_models WHERE slug LIKE 'demo-%'",
    );
    const delBrands = await client.query(
      "DELETE FROM brands WHERE slug LIKE 'demo-%'",
    );
    const delCategories = await client.query(
      "DELETE FROM categories WHERE slug LIKE 'demo-%'",
    );
    await client.query("COMMIT");

    console.log(
      `[db:seed:clean] Removed demo data: ${delProducts.rowCount ?? 0} products, ${delModels.rowCount ?? 0} printer models, ${delBrands.rowCount ?? 0} brands, ${delCategories.rowCount ?? 0} categories.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedDemoData(options?: { allowProduction?: boolean }) {
  if (env.NODE_ENV === "production" && !options?.allowProduction) {
    throw new Error(
      "Refusing to seed demonstration records when NODE_ENV=production. Pass --allow-production-demo only if explicitly intended.",
    );
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const categoryIds = new Map<string, string>();
    for (const cat of DEMO_CATEGORIES) {
      await client.query(
        `INSERT INTO categories (slug, name, description, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, cat.name, cat.description, cat.sortOrder],
      );
      const res = await client.query<{ id: string }>(
        "SELECT id FROM categories WHERE slug = $1 LIMIT 1",
        [cat.slug],
      );
      if (res.rows[0]?.id) {
        categoryIds.set(cat.slug, res.rows[0].id);
      }
    }

    const brandIds = new Map<string, string>();
    for (const br of DEMO_BRANDS) {
      await client.query(
        `INSERT INTO brands (slug, name, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (slug) DO NOTHING`,
        [br.slug, br.name],
      );
      const res = await client.query<{ id: string }>(
        "SELECT id FROM brands WHERE slug = $1 LIMIT 1",
        [br.slug],
      );
      if (res.rows[0]?.id) {
        brandIds.set(br.slug, res.rows[0].id);
      }
    }

    const printerModelIds = new Map<string, string>();
    for (const pm of DEMO_PRINTER_MODELS) {
      const brandId = brandIds.get(pm.brandSlug) ?? null;
      await client.query(
        `INSERT INTO printer_models (brand_id, slug, name, series)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [brandId, pm.slug, pm.name, pm.series],
      );
      const res = await client.query<{ id: string }>(
        "SELECT id FROM printer_models WHERE slug = $1 LIMIT 1",
        [pm.slug],
      );
      if (res.rows[0]?.id) {
        printerModelIds.set(pm.slug, res.rows[0].id);
      }
    }

    let insertedProducts = 0;
    for (const prod of DEMO_PRODUCTS) {
      const categoryId = categoryIds.get(prod.categorySlug);
      const brandId = brandIds.get(prod.brandSlug) ?? null;
      if (!categoryId) continue;

      const insertRes = await client.query<{ id: string }>(
        `INSERT INTO products (
           slug, name, description, category_id, brand_id, sku, oem_part_number,
           product_type, condition, authenticity, page_yield, color,
           price_kes, compare_price_kes, stock_quantity, is_published, is_featured
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [
          prod.slug,
          prod.name,
          prod.description,
          categoryId,
          brandId,
          prod.sku,
          prod.oemPartNumber,
          prod.productType,
          prod.condition,
          prod.authenticity,
          prod.pageYield,
          prod.color,
          prod.priceKes,
          prod.comparePriceKes,
          prod.stockQuantity,
          prod.isPublished,
          prod.isFeatured,
        ],
      );

      let productId = insertRes.rows[0]?.id;
      if (productId) {
        insertedProducts++;
      } else {
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM products WHERE slug = $1 LIMIT 1",
          [prod.slug],
        );
        productId = existing.rows[0]?.id;
      }

      if (!productId) continue;

      for (const variant of prod.variants) {
        await client.query(
          `INSERT INTO product_variants (
             product_id, name, sku, oem_part_number, authenticity,
             page_yield, price_kes, compare_price_kes, stock_quantity, is_active, sort_order
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
           ON CONFLICT (sku) DO NOTHING`,
          [
            productId,
            variant.name,
            variant.sku,
            variant.oemPartNumber,
            variant.authenticity,
            variant.pageYield,
            variant.priceKes,
            variant.comparePriceKes,
            variant.stockQuantity,
            variant.sortOrder,
          ],
        );
      }

      for (const modelSlug of prod.compatibleModelSlugs) {
        const printerModelId = printerModelIds.get(modelSlug);
        if (!printerModelId) continue;

        await client.query(
          `INSERT INTO product_printer_compatibility (product_id, printer_model_id)
           VALUES ($1, $2)
           ON CONFLICT (product_id, printer_model_id) DO NOTHING`,
          [productId, printerModelId],
        );
      }
    }

    await client.query("COMMIT");
    console.log(
      `[db:seed] Demo seed complete (${insertedProducts} new demo product(s) inserted; existing records preserved).`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isClean = args.has("--clean");
  const allowProduction = args.has("--allow-production-demo");

  try {
    if (isClean) {
      await cleanDemoData();
    } else {
      await seedDemoData({ allowProduction });
    }
  } catch (err) {
    console.error(`[db:seed] Failed: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await main();
}

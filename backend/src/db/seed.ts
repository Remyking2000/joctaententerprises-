/**
 * Repeatable, idempotent seed script for Jocta Enterprises.
 *
 * Seeds the 5 official partner brands (HP, Konica Minolta, Brother, Canon, Kyocera),
 * core product categories, and compatible printer company categories.
 */

import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { closeDb, getPool } from "../config/db.js";

export const CATALOG_CATEGORIES = [
  {
    slug: "laser-toners",
    name: "Laser Toner Cartridges",
    description:
      "Monochrome and color laser toner cartridges for office and enterprise printers.",
    sortOrder: 1,
  },
  {
    slug: "drum-units",
    name: "Drum & Imaging Units",
    description:
      "Replacement drum units and imaging kits for laser printers and copiers.",
    sortOrder: 2,
  },
  {
    slug: "printer-parts",
    name: "Printer Spare Parts",
    description:
      "Fuser assemblies, pickup rollers, transfer belts, and maintenance kits.",
    sortOrder: 3,
  },
  {
    slug: "ink-consumables",
    name: "Ink Bottles & Consumables",
    description:
      "Continuous ink tank bottles, cartridges, and printing consumables.",
    sortOrder: 4,
  },
  {
    slug: "printers",
    name: "Office Printers",
    description:
      "Laser and multifunction office printers and copiers.",
    sortOrder: 5,
  },
] as const;

export const CATALOG_BRANDS = [
  { slug: "hp", name: "HP", logoUrl: "/brands/hp.png" },
  {
    slug: "konica-minolta",
    name: "Konica Minolta",
    logoUrl: "/brands/konica-minolta.png",
  },
  { slug: "brother", name: "Brother", logoUrl: "/brands/brother.png" },
  { slug: "canon", name: "Canon", logoUrl: "/brands/canon.png" },
  { slug: "kyocera", name: "Kyocera", logoUrl: "/brands/kyocera.png" },
] as const;

export const CATALOG_PRINTER_MODELS = [
  {
    slug: "hp",
    brandSlug: "hp",
    name: "HP",
    series: "LaserJet & OfficeJet Series",
  },
  {
    slug: "konica-minolta",
    brandSlug: "konica-minolta",
    name: "Konica Minolta",
    series: "bizhub & PagePro Series",
  },
  {
    slug: "brother",
    brandSlug: "brother",
    name: "Brother",
    series: "HL, DCP & MFC Series",
  },
  {
    slug: "canon",
    brandSlug: "canon",
    name: "Canon",
    series: "imageRUNNER & i-SENSYS Series",
  },
  {
    slug: "kyocera",
    brandSlug: "kyocera",
    name: "Kyocera",
    series: "ECOSYS & TASKalfa Series",
  },
] as const;

export const CATALOG_PRODUCTS = [
  {
    slug: "hp-59a-cf259a-black-toner",
    name: "HP 59A (CF259A) Black LaserJet Toner Cartridge",
    description:
      "Monochrome laser toner cartridge with selectable Original OEM and Compatible options.",
    categorySlug: "laser-toners",
    brandSlug: "hp",
    sku: "JOC-TON-CF259A",
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
    compatibleModelSlugs: ["hp"],
    variants: [
      {
        name: "Compatible Standard Yield (3,000 pages)",
        sku: "JOC-TON-CF259A-COMP",
        oemPartNumber: "CF259A",
        authenticity: "compatible",
        pageYield: 3000,
        priceKes: "3800.00",
        comparePriceKes: "4500.00",
        stockQuantity: 14,
        sortOrder: 1,
      },
      {
        name: "Original HP 59A OEM Standard Yield (3,000 pages)",
        sku: "JOC-TON-CF259A-OEM",
        oemPartNumber: "CF259A",
        authenticity: "original",
        pageYield: 3000,
        priceKes: "12500.00",
        comparePriceKes: null,
        stockQuantity: 4,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "canon-c-exv-63-drum-unit",
    name: "Canon C-EXV 63 Drum Unit",
    description:
      "Original imaging drum unit for Canon imageRUNNER ADVANCE DX series.",
    categorySlug: "drum-units",
    brandSlug: "canon",
    sku: "JOC-DRU-5144C002",
    oemPartNumber: "5144C002",
    productType: "drum",
    condition: "new",
    authenticity: "original",
    pageYield: 472000,
    color: "Black",
    priceKes: "18500.00",
    comparePriceKes: null,
    stockQuantity: 10,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: ["canon"],
    variants: [],
  },
  {
    slug: "konica-minolta-tn-324k-black-toner",
    name: "Konica Minolta TN-324K Black Toner Cartridge",
    description:
      "High-capacity black laser toner cartridge for Konica Minolta bizhub series.",
    categorySlug: "laser-toners",
    brandSlug: "konica-minolta",
    sku: "JOC-TON-TN324K",
    oemPartNumber: "A8DA150",
    productType: "toner",
    condition: "new",
    authenticity: "original",
    pageYield: 28000,
    color: "Black",
    priceKes: "9500.00",
    comparePriceKes: null,
    stockQuantity: 12,
    isPublished: true,
    isFeatured: true,
    compatibleModelSlugs: ["konica-minolta"],
    variants: [],
  },
  {
    slug: "brother-dr-2305-drum-unit",
    name: "Brother DR-2305 Replacement Drum Unit",
    description:
      "Replacement optical imaging drum unit rated at 12,000 pages for Brother HL & MFC series.",
    categorySlug: "drum-units",
    brandSlug: "brother",
    sku: "JOC-DRM-DR2305",
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
    compatibleModelSlugs: ["brother"],
    variants: [],
  },
  {
    slug: "kyocera-tk-1170-toner-kit",
    name: "Kyocera TK-1170 Black Toner Kit",
    description:
      "High-capacity monochrome toner kit for Kyocera ECOSYS M2040dn / M2540dn / M2640idw series.",
    categorySlug: "laser-toners",
    brandSlug: "kyocera",
    sku: "JOC-TON-TK1170",
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
    compatibleModelSlugs: ["kyocera"],
    variants: [],
  },
] as const;

/**
 * Deletes placeholder records left over from early development (slugs
 * starting `demo-`, SKUs starting `DEMO-`). Real catalogue data is untouched.
 */
export async function removePlaceholderRecords() {
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
      `[db:seed:clean] Removed placeholder records: ${delProducts.rowCount ?? 0} products, ${delModels.rowCount ?? 0} printer models, ${delBrands.rowCount ?? 0} brands, ${delCategories.rowCount ?? 0} categories.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedCatalog(options?: { allowProduction?: boolean }) {
  if (env.NODE_ENV === "production" && !options?.allowProduction) {
    throw new Error(
      "Refusing to seed the starter catalogue when NODE_ENV=production. Pass --allow-production to seed a new production database.",
    );
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const categoryIds = new Map<string, string>();
    for (const cat of CATALOG_CATEGORIES) {
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
    for (const br of CATALOG_BRANDS) {
      await client.query(
        `INSERT INTO brands (slug, name, logo_url, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (slug) DO NOTHING`,
        [br.slug, br.name, br.logoUrl],
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
    for (const pm of CATALOG_PRINTER_MODELS) {
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
    for (const prod of CATALOG_PRODUCTS) {
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
      `[db:seed] Seed complete (${insertedProducts} new product(s) inserted; existing records preserved).`,
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
  const allowProduction = args.has("--allow-production");

  try {
    if (isClean) {
      await removePlaceholderRecords();
    } else {
      await seedCatalog({ allowProduction });
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

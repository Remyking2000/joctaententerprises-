import { Router } from "express";
import {
  compatibleProductsQuerySchema,
  printerModelQuerySchema,
  productListQuerySchema,
  slugParamSchema,
} from "@jocta/shared";
import { CatalogController } from "../controllers/catalog.controller.js";
import { validateRequest } from "../middleware/error.middleware.js";

const router = Router();

router.get("/categories", CatalogController.listCategories);
router.get("/brands", CatalogController.listBrands);

router.get(
  "/printer-models",
  validateRequest({ query: printerModelQuerySchema }),
  CatalogController.listPrinterModels,
);

router.get(
  "/printer-models/:slug/compatible-products",
  validateRequest({
    params: slugParamSchema,
    query: compatibleProductsQuerySchema,
  }),
  CatalogController.getCompatibleProductsForPrinterModel,
);

router.get(
  "/products",
  validateRequest({ query: productListQuerySchema }),
  CatalogController.listProducts,
);

router.get(
  "/products/:slug",
  validateRequest({ params: slugParamSchema }),
  CatalogController.getProductBySlug,
);

export default router;

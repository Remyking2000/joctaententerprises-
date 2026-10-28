import { Router } from "express";
import {
  adminProductListQuerySchema,
  createBrandSchema,
  createCategorySchema,
  createProductSchema,
  togglePublishSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateProductSchema,
} from "@jocta/shared";
import { AdminController } from "../controllers/admin.controller.js";
import { validateRequest } from "../middleware/error.middleware.js";

const router = Router();

// Stats
router.get("/stats", AdminController.getStats);
router.post("/demo/reset", AdminController.resetDemoData);

// Products
router.get(
  "/products",
  validateRequest({ query: adminProductListQuerySchema }),
  AdminController.listProducts,
);
router.get("/products/:id", AdminController.getProductById);
router.post(
  "/products",
  validateRequest({ body: createProductSchema }),
  AdminController.createProduct,
);
router.put(
  "/products/:id",
  validateRequest({ body: updateProductSchema }),
  AdminController.updateProduct,
);
router.patch(
  "/products/:id/publish",
  validateRequest({ body: togglePublishSchema }),
  AdminController.toggleProductPublish,
);

// Categories
router.post(
  "/categories",
  validateRequest({ body: createCategorySchema }),
  AdminController.createCategory,
);
router.put(
  "/categories/:id",
  validateRequest({ body: updateCategorySchema }),
  AdminController.updateCategory,
);

// Brands
router.post(
  "/brands",
  validateRequest({ body: createBrandSchema }),
  AdminController.createBrand,
);
router.put(
  "/brands/:id",
  validateRequest({ body: updateBrandSchema }),
  AdminController.updateBrand,
);

export default router;

import { Router } from "express";
import {
  adminPrinterModelListQuerySchema,
  adminProductListQuerySchema,
  createBrandSchema,
  createCategorySchema,
  createPrinterModelSchema,
  createProductSchema,
  togglePublishSchema,
  updateBrandSchema,
  updateCategorySchema,
  updatePrinterModelSchema,
  updateProductSchema,
  uploadImageSchema,
} from "@jocta/shared";
import { AdminController } from "../controllers/admin.controller.js";
import { validateRequest } from "../middleware/error.middleware.js";

const router = Router();

// Stats
router.get("/stats", AdminController.getStats);
router.post("/demo/reset", AdminController.resetDemoData);

// Image Upload
router.post(
  "/upload",
  validateRequest({ body: uploadImageSchema }),
  AdminController.uploadImage,
);

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
router.delete("/products/:id", AdminController.deleteProduct);

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
router.delete("/categories/:id", AdminController.deleteCategory);

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
router.delete("/brands/:id", AdminController.deleteBrand);

// Printer Models
router.get(
  "/printer-models",
  validateRequest({ query: adminPrinterModelListQuerySchema }),
  AdminController.listPrinterModels,
);
router.post(
  "/printer-models",
  validateRequest({ body: createPrinterModelSchema }),
  AdminController.createPrinterModel,
);
router.put(
  "/printer-models/:id",
  validateRequest({ body: updatePrinterModelSchema }),
  AdminController.updatePrinterModel,
);
router.delete("/printer-models/:id", AdminController.deletePrinterModel);

export default router;

import { Router } from "express";
import {
  createSaleSchema,
  receiveStockSchema,
  salesQuerySchema,
  salesReportQuerySchema,
  stockAdjustSchema,
  stockMovementsQuerySchema,
  stockSettingsSchema,
  stockTakeSchema,
  voidSaleSchema,
} from "@jocta/shared";
import { InventoryController } from "../controllers/inventory.controller.js";
import { validateRequest } from "../middleware/error.middleware.js";

/**
 * Inventory API, mounted at /api/admin/inventory behind requireAdminAuth.
 * Stock levels, costs and sales are never exposed publicly.
 */
const router = Router();

router.get("/items", InventoryController.listItems);
router.get("/dashboard", InventoryController.dashboard);
router.get(
  "/movements",
  validateRequest({ query: stockMovementsQuerySchema }),
  InventoryController.movements,
);

router.post("/adjust", validateRequest({ body: stockAdjustSchema }), InventoryController.adjust);
router.post("/receive", validateRequest({ body: receiveStockSchema }), InventoryController.receive);
router.post("/stock-take", validateRequest({ body: stockTakeSchema }), InventoryController.stockTake);
router.patch(
  "/settings",
  validateRequest({ body: stockSettingsSchema }),
  InventoryController.updateSettings,
);

router.get("/sales", validateRequest({ query: salesQuerySchema }), InventoryController.listSales);
router.post("/sales", validateRequest({ body: createSaleSchema }), InventoryController.createSale);
router.get(
  "/sales/report",
  validateRequest({ query: salesReportQuerySchema }),
  InventoryController.salesReport,
);
router.post(
  "/sales/:id/void",
  validateRequest({ body: voidSaleSchema }),
  InventoryController.voidSale,
);

export default router;

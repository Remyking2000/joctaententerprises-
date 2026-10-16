import { Router } from "express";
import { HealthController } from "../controllers/health.controller.js";

const router = Router();

router.get("/", HealthController.getHealth);
router.get("/db", HealthController.getDatabaseHealth);

export default router;

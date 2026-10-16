import type { NextFunction, Request, Response } from "express";
import type { ProductListQuery } from "@jocta/shared";
import { CatalogService } from "../services/catalog.service.js";
import { AppError } from "../middleware/error.middleware.js";

export const CatalogController = {
  async listCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await CatalogService.listCategories();
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },

  async listBrands(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await CatalogService.listBrands();
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },

  async listProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const query = res.locals.validated.query as ProductListQuery;
      const result = await CatalogService.listProducts(query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getProductBySlug(_req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = res.locals.validated.params as { slug: string };
      const product = await CatalogService.getProductBySlug(slug);
      if (!product) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", `Product "${slug}" was not found`);
      }
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },
};

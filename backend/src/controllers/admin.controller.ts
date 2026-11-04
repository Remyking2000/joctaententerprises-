import type { NextFunction, Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";
import { AppError } from "../middleware/error.middleware.js";

export const AdminController = {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  async resetDemoData(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.resetDemoData();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  async listProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = res.locals.validated?.query ?? {};
      const result = await AdminService.listProducts(validatedQuery);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const product = await AdminService.getProductById(id);
      if (!product) {
        throw new AppError(404, "NOT_FOUND", `Product not found.`);
      }
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async createProduct(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = res.locals.validated?.body;
      const product = await AdminService.createProduct(validatedBody);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validatedBody = res.locals.validated?.body;
      const product = await AdminService.updateProduct(id, validatedBody);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async toggleProductPublish(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { isPublished } = res.locals.validated?.body ?? {};
      const product = await AdminService.toggleProductPublish(id, isPublished);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = res.locals.validated?.body;
      const category = await AdminService.createCategory(validatedBody);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  },

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validatedBody = res.locals.validated?.body;
      const category = await AdminService.updateCategory(id, validatedBody);
      res.json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  },

  async createBrand(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = res.locals.validated?.body;
      const brand = await AdminService.createBrand(validatedBody);
      res.status(201).json({ success: true, data: brand });
    } catch (err) {
      next(err);
    }
  },

  async updateBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validatedBody = res.locals.validated?.body;
      const brand = await AdminService.updateBrand(id, validatedBody);
      res.json({ success: true, data: brand });
    } catch (err) {
      next(err);
    }
  },

  async listPrinterModels(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = res.locals.validated?.query ?? {};
      const models = await AdminService.listPrinterModels(validatedQuery);
      res.json({ success: true, data: models });
    } catch (err) {
      next(err);
    }
  },

  async createPrinterModel(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = res.locals.validated?.body;
      const model = await AdminService.createPrinterModel(validatedBody);
      res.status(201).json({ success: true, data: model });
    } catch (err) {
      next(err);
    }
  },

  async updatePrinterModel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validatedBody = res.locals.validated?.body;
      const model = await AdminService.updatePrinterModel(id, validatedBody);
      res.json({ success: true, data: model });
    } catch (err) {
      next(err);
    }
  },

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.deleteProduct(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.deleteCategory(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async deleteBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.deleteBrand(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async deletePrinterModel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.deletePrinterModel(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(_req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = res.locals.validated?.body;
      const uploaded = await AdminService.uploadImage(validatedBody);
      res.status(201).json({ success: true, data: uploaded });
    } catch (err) {
      next(err);
    }
  },
};

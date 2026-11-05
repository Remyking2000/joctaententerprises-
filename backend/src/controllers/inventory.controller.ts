import type { NextFunction, Request, Response } from "express";
import { InventoryService } from "../services/inventory.service.js";

function actorEmail(res: Response): string {
  return (res.locals.user?.email as string | undefined) ?? "";
}

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Wraps a handler so it replies `{ success, data }` and forwards errors. */
function handle(fn: Handler, status = 200) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn(req, res);
      res.status(status).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

const body = (res: Response) => res.locals.validated?.body;
const query = (res: Response) => res.locals.validated?.query;

export const InventoryController = {
  listItems: handle(() => InventoryService.listItems()),
  dashboard: handle(() => InventoryService.getDashboard()),
  movements: handle((_req, res) => InventoryService.listMovements(query(res))),
  adjust: handle((_req, res) => InventoryService.adjust(body(res), actorEmail(res))),
  receive: handle(
    (_req, res) => InventoryService.receive(body(res), actorEmail(res)),
    201,
  ),
  stockTake: handle(
    (_req, res) => InventoryService.stockTake(body(res), actorEmail(res)),
    201,
  ),
  updateSettings: handle((_req, res) => InventoryService.updateSettings(body(res))),
  listSales: handle((_req, res) => InventoryService.listSales(query(res))),
  createSale: handle(
    (_req, res) => InventoryService.createSale(body(res), actorEmail(res)),
    201,
  ),
  voidSale: handle((req, res) =>
    InventoryService.voidSale(String(req.params.id), body(res), actorEmail(res)),
  ),
  salesReport: handle((_req, res) => InventoryService.salesReport(query(res))),
};

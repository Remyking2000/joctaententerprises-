import type {
  AdminPrinterModelListQuery,
  AdminProductListQuery,
  AdminStatsSummary,
  AdminUser,
  ApiErrorResponse,
  ApiSuccessResponse,
  BrandSummary,
  CategorySummary,
  CompatibleProductsQuery,
  CompatibleProductsResponse,
  CreateBrandInput,
  CreateCategoryInput,
  CreatePrinterModelInput,
  CreateProductInput,
  PaginatedProductsResponse,
  PrinterModelQuery,
  PrinterModelSummary,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdatePrinterModelInput,
  UpdateProductInput,
  UploadedImageResponse,
  UploadImageInput,
  BulkStockResult,
  CreateSalePayload,
  InventoryDashboard,
  ReceiveStockPayload,
  Sale,
  SalesQuery,
  SalesReport,
  StockAdjustPayload,
  StockItem,
  StockMovement,
  StockMovementsQuery,
  StockSettingsPayload,
  StockTakePayload,
  VoidSaleInput,
} from "@jocta/shared";

const rawApiBase = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? ""
).replace(/\/$/, "");

// In local Vite dev mode, use the built-in same-origin /api proxy when pointing at localhost:4000
// so HTTP-only session cookies are always first-party on the dev server origin.
const API_BASE =
  import.meta.env.DEV && rawApiBase === "http://localhost:4000"
    ? ""
    : rawApiBase;

export const AUTH_TOKEN_STORAGE_KEY = "jocta_admin_session_token";

let memoryAuthToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function getStoredAuthToken(): string | null {
  if (memoryAuthToken) return memoryAuthToken;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (stored) {
        memoryAuthToken = stored;
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function setStoredAuthToken(token: string | null): void {
  memoryAuthToken = token;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) {
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

async function fetchJson<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
  },
): Promise<T> {
  let response: Response;
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const token = getStoredAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    response = await fetch(`${API_BASE}${path}`, {
      method: options?.method ?? "GET",
      headers,
      credentials: "include",
      body:
        options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the Jocta catalogue server. Ensure the backend API is running.",
    );
  }

  let payload: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
  try {
    payload = (await response.json()) as
      | ApiSuccessResponse<T>
      | ApiErrorResponse;
  } catch {
    throw new ApiClientError(
      response.status,
      "INVALID_RESPONSE",
      `Server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !payload || !payload.success) {
    if (response.status === 401 && !path.endsWith("/auth/google")) {
      setStoredAuthToken(null);
      unauthorizedHandler?.();
    }
    const errPayload = payload as ApiErrorResponse | null;
    throw new ApiClientError(
      response.status,
      errPayload?.error?.code ?? "API_ERROR",
      errPayload?.error?.message ??
        `Request failed with status ${response.status}.`,
    );
  }

  return payload.data;
}

export const catalogApi = {
  getCategories(): Promise<CategorySummary[]> {
    return fetchJson<CategorySummary[]>("/api/categories");
  },

  getBrands(): Promise<BrandSummary[]> {
    return fetchJson<BrandSummary[]>("/api/brands");
  },

  getProducts(
    query: Partial<ProductListQuery> = {},
  ): Promise<PaginatedProductsResponse> {
    const qs = buildQueryString(query as Record<string, unknown>);
    return fetchJson<PaginatedProductsResponse>(`/api/products${qs}`);
  },

  getProductBySlug(slug: string): Promise<ProductDetail> {
    return fetchJson<ProductDetail>(
      `/api/products/${encodeURIComponent(slug)}`,
    );
  },

  getPrinterModels(
    query: Partial<PrinterModelQuery> = {},
  ): Promise<PrinterModelSummary[]> {
    const qs = buildQueryString(query as Record<string, unknown>);
    return fetchJson<PrinterModelSummary[]>(`/api/printer-models${qs}`);
  },

  getCompatibleProducts(
    printerModelSlug: string,
    query: Partial<CompatibleProductsQuery> = {},
  ): Promise<CompatibleProductsResponse> {
    const qs = buildQueryString(query as Record<string, unknown>);
    return fetchJson<CompatibleProductsResponse>(
      `/api/printer-models/${encodeURIComponent(printerModelSlug)}/compatible-products${qs}`,
    );
  },
};

export const adminApi = {
  getStats(): Promise<AdminStatsSummary> {
    return fetchJson<AdminStatsSummary>("/api/admin/stats");
  },

  resetDemoData(): Promise<AdminStatsSummary> {
    return fetchJson<AdminStatsSummary>("/api/admin/demo/reset", {
      method: "POST",
    });
  },

  getProducts(
    query: Partial<AdminProductListQuery> = {},
  ): Promise<PaginatedProductsResponse> {
    const qs = buildQueryString(query as Record<string, unknown>);
    return fetchJson<PaginatedProductsResponse>(`/api/admin/products${qs}`);
  },

  getProductById(id: string): Promise<ProductDetail> {
    return fetchJson<ProductDetail>(
      `/api/admin/products/${encodeURIComponent(id)}`,
    );
  },

  createProduct(input: CreateProductInput): Promise<ProductSummary> {
    return fetchJson<ProductSummary>("/api/admin/products", {
      method: "POST",
      body: input,
    });
  },

  updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductSummary> {
    return fetchJson<ProductSummary>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: input,
      },
    );
  },

  toggleProductPublish(
    id: string,
    isPublished: boolean,
  ): Promise<ProductSummary> {
    return fetchJson<ProductSummary>(
      `/api/admin/products/${encodeURIComponent(id)}/publish`,
      {
        method: "PATCH",
        body: { isPublished },
      },
    );
  },

  createCategory(input: CreateCategoryInput): Promise<CategorySummary> {
    return fetchJson<CategorySummary>("/api/admin/categories", {
      method: "POST",
      body: input,
    });
  },

  updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategorySummary> {
    return fetchJson<CategorySummary>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: input,
      },
    );
  },

  createBrand(input: CreateBrandInput): Promise<BrandSummary> {
    return fetchJson<BrandSummary>("/api/admin/brands", {
      method: "POST",
      body: input,
    });
  },

  updateBrand(id: string, input: UpdateBrandInput): Promise<BrandSummary> {
    return fetchJson<BrandSummary>(
      `/api/admin/brands/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: input,
      },
    );
  },

  getPrinterModels(
    query: Partial<AdminPrinterModelListQuery> = {},
  ): Promise<PrinterModelSummary[]> {
    const qs = buildQueryString(query as Record<string, unknown>);
    return fetchJson<PrinterModelSummary[]>(`/api/admin/printer-models${qs}`);
  },

  createPrinterModel(
    input: CreatePrinterModelInput,
  ): Promise<PrinterModelSummary> {
    return fetchJson<PrinterModelSummary>("/api/admin/printer-models", {
      method: "POST",
      body: input,
    });
  },

  updatePrinterModel(
    id: string,
    input: UpdatePrinterModelInput,
  ): Promise<PrinterModelSummary> {
    return fetchJson<PrinterModelSummary>(
      `/api/admin/printer-models/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: input,
      },
    );
  },

  deleteProduct(id: string): Promise<{ id: string }> {
    return fetchJson<{ id: string }>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  deleteCategory(id: string): Promise<{ id: string }> {
    return fetchJson<{ id: string }>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  deleteBrand(id: string): Promise<{ id: string }> {
    return fetchJson<{ id: string }>(
      `/api/admin/brands/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  deletePrinterModel(id: string): Promise<{ id: string }> {
    return fetchJson<{ id: string }>(
      `/api/admin/printer-models/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  uploadImage(input: UploadImageInput): Promise<UploadedImageResponse> {
    return fetchJson<UploadedImageResponse>("/api/admin/upload", {
      method: "POST",
      body: input,
    });
  },

  async loginWithGoogle(
    credential: string,
  ): Promise<{ user: AdminUser; token?: string }> {
    const data = await fetchJson<{ user: AdminUser; token?: string }>(
      "/api/auth/google",
      {
        method: "POST",
        body: { credential },
      },
    );
    if (data.token) {
      setStoredAuthToken(data.token);
    }
    return data;
  },

  async getMe(): Promise<{ user: AdminUser; token?: string }> {
    const data = await fetchJson<{ user: AdminUser; token?: string }>(
      "/api/auth/me",
      {
        method: "GET",
      },
    );
    if (data.token) {
      setStoredAuthToken(data.token);
    }
    return data;
  },

  async logout(): Promise<{ message: string }> {
    try {
      return await fetchJson<{ message: string }>("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      setStoredAuthToken(null);
    }
  },
};

export const authApi = {
  loginWithGoogle(credential: string): Promise<{ user: AdminUser }> {
    return adminApi.loginWithGoogle(credential);
  },
  getMe(): Promise<{ user: AdminUser }> {
    return adminApi.getMe();
  },
  logout(): Promise<{ message: string }> {
    return adminApi.logout();
  },
};

// ── Inventory (admin only) ───────────────────────────────────────────────────

const INVENTORY = "/api/admin/inventory";

export const inventoryApi = {
  getItems(): Promise<StockItem[]> {
    return fetchJson<StockItem[]>(`${INVENTORY}/items`);
  },

  getDashboard(): Promise<InventoryDashboard> {
    return fetchJson<InventoryDashboard>(`${INVENTORY}/dashboard`);
  },

  getMovements(
    query: Partial<Omit<StockMovementsQuery, "limit">> & { limit?: number } = {},
  ): Promise<StockMovement[]> {
    return fetchJson<StockMovement[]>(
      `${INVENTORY}/movements${buildQueryString(query)}`,
    );
  },

  adjust(
    input: StockAdjustPayload,
  ): Promise<{ item: StockItem; movement: StockMovement | null }> {
    return fetchJson(`${INVENTORY}/adjust`, { method: "POST", body: input });
  },

  receive(input: ReceiveStockPayload): Promise<BulkStockResult> {
    return fetchJson<BulkStockResult>(`${INVENTORY}/receive`, {
      method: "POST",
      body: input,
    });
  },

  stockTake(input: StockTakePayload): Promise<BulkStockResult> {
    return fetchJson<BulkStockResult>(`${INVENTORY}/stock-take`, {
      method: "POST",
      body: input,
    });
  },

  updateSettings(input: StockSettingsPayload): Promise<StockItem> {
    return fetchJson<StockItem>(`${INVENTORY}/settings`, {
      method: "PATCH",
      body: input,
    });
  },

  getSales(query: SalesQuery = {}): Promise<Sale[]> {
    return fetchJson<Sale[]>(`${INVENTORY}/sales${buildQueryString(query)}`);
  },

  createSale(input: CreateSalePayload): Promise<Sale> {
    return fetchJson<Sale>(`${INVENTORY}/sales`, { method: "POST", body: input });
  },

  voidSale(id: string, input: VoidSaleInput): Promise<Sale> {
    return fetchJson<Sale>(
      `${INVENTORY}/sales/${encodeURIComponent(id)}/void`,
      { method: "POST", body: input },
    );
  },

  getSalesReport(month?: string): Promise<SalesReport> {
    return fetchJson<SalesReport>(
      `${INVENTORY}/sales/report${buildQueryString({ month })}`,
    );
  },
};

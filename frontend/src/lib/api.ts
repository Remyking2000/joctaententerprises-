import type {
  AdminProductListQuery,
  AdminStatsSummary,
  ApiErrorResponse,
  ApiSuccessResponse,
  BrandSummary,
  CategorySummary,
  CompatibleProductsQuery,
  CompatibleProductsResponse,
  CreateBrandInput,
  CreateCategoryInput,
  CreateProductInput,
  PaginatedProductsResponse,
  PrinterModelQuery,
  PrinterModelSummary,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateProductInput,
} from "@jocta/shared";

const API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? ""
).replace(/\/$/, "");

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
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    response = await fetch(`${API_BASE}${path}`, {
      method: options?.method ?? "GET",
      headers,
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
};

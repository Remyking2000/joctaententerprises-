import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ProductAuthenticity,
  ProductDetail,
  ProductSummary,
  ProductType,
} from "@jocta/shared";
import { useAdminAuth } from "./AdminAuthContext";
import type { ProvisionalCartItem } from "./CartContext";

const WISHLIST_STORAGE_KEY = "jocta-customer-wishlist-v1";
const ORDERS_STORAGE_KEY = "jocta-customer-orders-v1";
const PROFILE_STORAGE_KEY_PREFIX = "jocta-customer-profile-v1:";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  oemPartNumber: string | null;
  productType: ProductType;
  authenticity: ProductAuthenticity;
  priceKes: string;
  comparePriceKes: string | null;
  stockQuantity: number;
  thumbnailUrl: string;
  images: string[];
  brandName?: string | null;
  categoryName?: string | null;
  addedAt: string;
}

export type CustomerOrderStatus = "sent_whatsapp" | "saved";

export interface CustomerOrder {
  id: string;
  reference: string;
  createdAt: string;
  userEmail: string | null;
  customerName: string;
  customerPhone: string;
  company: string;
  deliveryAddress: string;
  note: string;
  status: CustomerOrderStatus;
  subtotalKes: number;
  totalItems: number;
  items: ProvisionalCartItem[];
}

export interface CustomerProfile {
  fullName: string;
  phone: string;
  company: string;
  deliveryAddress: string;
  city: string;
  preferredPrinterModel: string;
  deliveryNotes: string;
  updatedAt: string | null;
}

const DEFAULT_PROFILE: CustomerProfile = {
  fullName: "",
  phone: "",
  company: "",
  deliveryAddress: "",
  city: "Nairobi",
  preferredPrinterModel: "",
  deliveryNotes: "",
  updatedAt: null,
};

interface CustomerContextValue {
  // Wishlist
  wishlist: WishlistItem[];
  wishlistCount: number;
  isWishlisted: (slug: string) => boolean;
  toggleWishlist: (
    product: ProductSummary | ProductDetail | WishlistItem,
  ) => boolean;
  removeFromWishlist: (slug: string) => void;
  clearWishlist: () => void;

  // Orders
  orders: CustomerOrder[];
  recordOrder: (
    items: ProvisionalCartItem[],
    options?: { status?: CustomerOrderStatus; note?: string },
  ) => CustomerOrder | null;
  removeOrder: (id: string) => void;
  clearOrders: () => void;

  // Profile Preferences
  profile: CustomerProfile;
  updateProfile: (patch: Partial<CustomerProfile>) => void;
  resetProfile: () => void;

  // Global Sign-In Modal control
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function toWishlistItem(
  item: ProductSummary | ProductDetail | WishlistItem,
): WishlistItem {
  if ("productId" in item && "addedAt" in item) {
    return item;
  }
  return {
    productId: item.id,
    slug: item.slug,
    name: item.name,
    sku: item.sku,
    oemPartNumber: item.oemPartNumber,
    productType: item.productType,
    authenticity: item.authenticity,
    priceKes: item.priceKes,
    comparePriceKes: item.comparePriceKes,
    stockQuantity: item.stockQuantity,
    thumbnailUrl: item.thumbnailUrl,
    images: Array.isArray(item.images) ? item.images : [],
    brandName: item.brand?.name ?? null,
    categoryName: item.category?.name ?? null,
    addedAt: new Date().toISOString(),
  };
}

function generateOrderReference(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `JCT-${yyyy}${mm}${dd}-${suffix}`;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { user } = useAdminAuth();
  const normalizedEmail = user?.email ? user.email.trim().toLowerCase() : null;
  const profileStorageKey = `${PROFILE_STORAGE_KEY_PREFIX}${normalizedEmail ?? "guest"}`;

  // Each account (and the signed-out guest) keeps its own wishlist on this device.
  const wishlistKey = `${WISHLIST_STORAGE_KEY}:${normalizedEmail ?? "guest"}`;
  const readWishlist = (key: string): WishlistItem[] => {
    const parsed = readStorageJson<WishlistItem[] | null>(key, null);
    if (Array.isArray(parsed)) return parsed;
    // Wishlists saved before they were per-account belong to the guest.
    if (key.endsWith(":guest")) {
      const legacy = readStorageJson<WishlistItem[]>(WISHLIST_STORAGE_KEY, []);
      return Array.isArray(legacy) ? legacy : [];
    }
    return [];
  };
  const [wishlistState, setWishlistState] = useState(() => ({
    key: wishlistKey,
    items: readWishlist(wishlistKey),
  }));
  if (wishlistState.key !== wishlistKey) {
    setWishlistState({ key: wishlistKey, items: readWishlist(wishlistKey) });
  }
  const wishlist = wishlistState.items;
  const setWishlist = useCallback(
    (next: WishlistItem[] | ((prev: WishlistItem[]) => WishlistItem[])) =>
      setWishlistState((s) => ({
        key: s.key,
        items: typeof next === "function" ? next(s.items) : next,
      })),
    [],
  );

  const [allOrders, setAllOrders] = useState<CustomerOrder[]>(() => {
    const parsed = readStorageJson<CustomerOrder[]>(ORDERS_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  });

  const [profile, setProfile] = useState<CustomerProfile>(() => {
    const stored = readStorageJson<Partial<CustomerProfile>>(
      profileStorageKey,
      {},
    );
    return {
      ...DEFAULT_PROFILE,
      fullName: stored.fullName || user?.name || "",
      ...stored,
    };
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Reload profile when user changes (sign in / sign out)
  useEffect(() => {
    const stored = readStorageJson<Partial<CustomerProfile>>(
      profileStorageKey,
      {},
    );
    setProfile({
      ...DEFAULT_PROFILE,
      ...stored,
      fullName: stored.fullName || user?.name || "",
    });
  }, [profileStorageKey, user?.name]);

  // Persist wishlist under the account it belongs to
  useEffect(() => {
    writeStorageJson(wishlistState.key, wishlistState.items);
  }, [wishlistState]);

  // Persist orders
  useEffect(() => {
    writeStorageJson(ORDERS_STORAGE_KEY, allOrders);
  }, [allOrders]);

  const isWishlisted = useCallback(
    (slug: string) => wishlist.some((w) => w.slug === slug),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    (product: ProductSummary | ProductDetail | WishlistItem): boolean => {
      const slug = product.slug;
      const exists = wishlist.some((w) => w.slug === slug);
      if (exists) {
        setWishlist((prev) => prev.filter((w) => w.slug !== slug));
        return false;
      } else {
        const entry = toWishlistItem(product);
        setWishlist((prev) => [entry, ...prev.filter((w) => w.slug !== slug)]);
        return true;
      }
    },
    [wishlist, setWishlist],
  );

  const removeFromWishlist = useCallback(
    (slug: string) => {
      setWishlist((prev) => prev.filter((w) => w.slug !== slug));
    },
    [setWishlist],
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, [setWishlist]);

  // Orders visible to current user: their own, plus guest orders placed on
  // this device. Signed-out visitors only see guest orders — never another
  // account's orders on a shared computer.
  const orders = useMemo(() => {
    if (!normalizedEmail) {
      return allOrders.filter((o) => !o.userEmail);
    }
    return allOrders.filter(
      (o) => !o.userEmail || o.userEmail.toLowerCase() === normalizedEmail,
    );
  }, [allOrders, normalizedEmail]);

  const recordOrder = useCallback(
    (
      items: ProvisionalCartItem[],
      options?: { status?: CustomerOrderStatus; note?: string },
    ): CustomerOrder | null => {
      if (!items || items.length === 0) return null;

      const subtotalKes = items.reduce((sum, item) => {
        const unit = parseFloat(item.priceKes) || 0;
        return sum + unit * item.quantity;
      }, 0);

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      const newOrder: CustomerOrder = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        reference: generateOrderReference(),
        createdAt: new Date().toISOString(),
        userEmail: normalizedEmail,
        customerName: profile.fullName || user?.name || "",
        customerPhone: profile.phone || "",
        company: profile.company || "",
        deliveryAddress: [profile.deliveryAddress, profile.city]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", "),
        note: options?.note?.trim() || profile.deliveryNotes || "",
        status: options?.status ?? "sent_whatsapp",
        subtotalKes,
        totalItems,
        items: items.map((i) => ({ ...i })),
      };

      setAllOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    },
    [normalizedEmail, profile, user?.name],
  );

  const removeOrder = useCallback((id: string) => {
    setAllOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const clearOrders = useCallback(() => {
    if (!normalizedEmail) {
      setAllOrders([]);
      return;
    }
    setAllOrders((prev) =>
      prev.filter(
        (o) => o.userEmail && o.userEmail.toLowerCase() !== normalizedEmail,
      ),
    );
  }, [normalizedEmail]);

  const updateProfile = useCallback(
    (patch: Partial<CustomerProfile>) => {
      setProfile((prev) => {
        const next: CustomerProfile = {
          ...prev,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        writeStorageJson(profileStorageKey, next);
        return next;
      });
    },
    [profileStorageKey],
  );

  const resetProfile = useCallback(() => {
    const fresh: CustomerProfile = {
      ...DEFAULT_PROFILE,
      fullName: user?.name || "",
      updatedAt: null,
    };
    writeStorageJson(profileStorageKey, fresh);
    setProfile(fresh);
  }, [profileStorageKey, user?.name]);

  return (
    <CustomerContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        orders,
        recordOrder,
        removeOrder,
        clearOrders,
        profile,
        updateProfile,
        resetProfile,
        loginModalOpen,
        openLoginModal: () => setLoginModalOpen(true),
        closeLoginModal: () => setLoginModalOpen(false),
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return ctx;
}

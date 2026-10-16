import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductAuthenticity, VariantAuthenticity } from "@jocta/shared";

const STORAGE_KEY = "jocta-provisional-cart-v1";

export interface ProvisionalCartItem {
  itemKey: string;
  productSlug: string;
  productName: string;
  sku: string;
  oemPartNumber: string | null;
  authenticity: ProductAuthenticity | VariantAuthenticity;
  variantId?: string;
  variantName?: string;
  priceKes: string;
  quantity: number;
  maxStock: number;
}

interface CartContextValue {
  items: ProvisionalCartItem[];
  totalCount: number;
  subtotalKes: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    item: Omit<ProvisionalCartItem, "itemKey" | "quantity"> & {
      quantity?: number;
    },
  ) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  removeItem: (itemKey: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function resolveItemKey(item: {
  productSlug: string;
  variantId?: string;
}): string {
  return item.variantId
    ? `${item.productSlug}:var:${item.variantId}`
    : `${item.productSlug}:std`;
}

function readStoredCart(): ProvisionalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ProvisionalCartItem[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [items]);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotalKes = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unit = parseFloat(item.priceKes) || 0;
        return sum + unit * item.quantity;
      }, 0),
    [items],
  );

  function addItem(
    incoming: Omit<ProvisionalCartItem, "itemKey" | "quantity"> & {
      quantity?: number;
    },
  ) {
    const itemKey = resolveItemKey(incoming);
    const addQty = Math.max(1, incoming.quantity ?? 1);

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.itemKey === itemKey);
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        const nextQty =
          incoming.maxStock > 0
            ? Math.min(incoming.maxStock, current.quantity + addQty)
            : current.quantity + addQty;
        const copy = [...prev];
        copy[existingIdx] = { ...current, quantity: nextQty };
        return copy;
      }

      return [
        ...prev,
        {
          ...incoming,
          itemKey,
          quantity:
            incoming.maxStock > 0
              ? Math.min(incoming.maxStock, addQty)
              : addQty,
        },
      ];
    });
    setIsOpen(true);
  }

  function updateQuantity(itemKey: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(itemKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemKey !== itemKey) return item;
        const clamped =
          item.maxStock > 0 ? Math.min(item.maxStock, quantity) : quantity;
        return { ...item, quantity: Math.max(1, clamped) };
      }),
    );
  }

  function removeItem(itemKey: string) {
    setItems((prev) => prev.filter((item) => item.itemKey !== itemKey));
  }

  function clearCart() {
    setItems([]);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotalKes,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

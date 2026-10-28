import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CompatibilityFinderPage } from "./pages/CompatibilityFinderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminProductsPage } from "./admin/AdminProductsPage";
import { AdminProductFormPage } from "./admin/AdminProductFormPage";
import { AdminCategoriesPage } from "./admin/AdminCategoriesPage";
import { AdminBrandsPage } from "./admin/AdminBrandsPage";

export function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin Panel (Phase 1 Testing Foundation) */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route
              path="products/:id/edit"
              element={<AdminProductFormPage />}
            />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="brands" element={<AdminBrandsPage />} />
          </Route>

          {/* Storefront Layout & Public Pages */}
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="shop/:slug" element={<ProductPage />} />
            <Route
              path="compatibility"
              element={<CompatibilityFinderPage />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;

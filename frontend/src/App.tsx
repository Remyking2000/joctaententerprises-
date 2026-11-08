import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { CustomerProvider } from "./context/CustomerContext";
import { Layout } from "./components/Layout";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CompatibilityFinderPage } from "./pages/CompatibilityFinderPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { AccountPage } from "./pages/AccountPage";
import { OrdersPage } from "./pages/OrdersPage";
import { WishlistPage } from "./pages/WishlistPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminLoginPage } from "./admin/AdminLoginPage";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminProductsPage } from "./admin/AdminProductsPage";
import { AdminProductFormPage } from "./admin/AdminProductFormPage";
import { AdminCategoriesPage } from "./admin/AdminCategoriesPage";
import { AdminBrandsPage } from "./admin/AdminBrandsPage";
import { AdminPrinterModelsPage } from "./admin/AdminPrinterModelsPage";
import { InventoryDashboardPage } from "./inventory/InventoryDashboardPage";
import { StockLevelsPage } from "./inventory/StockLevelsPage";
import { ReceiveStockPage } from "./inventory/ReceiveStockPage";
import { StockTakePage } from "./inventory/StockTakePage";
import { MovementsPage } from "./inventory/MovementsPage";
import { RecordSalePage } from "./inventory/RecordSalePage";
import { SalesHistoryPage } from "./inventory/SalesHistoryPage";
import { SalesReportPage } from "./inventory/SalesReportPage";
import { InventoryLayout } from "./inventory/InventoryLayout";

/** Sends old /admin/inventory/... links to the inventory system's own pages. */
function LegacyInventoryRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/^\/admin\/inventory/, "/inventory") + search} replace />;
}

export function App() {
  return (
    <CartProvider>
      <AdminAuthProvider>
        <CustomerProvider>
          <BrowserRouter>
            <Routes>
              {/* Admin Authentication */}
              <Route path="admin/login" element={<AdminLoginPage />} />

              {/* Protected Admin Panel */}
              <Route
                path="admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="products/new" element={<AdminProductFormPage />} />
                <Route
                  path="products/:id/edit"
                  element={<AdminProductFormPage />}
                />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="brands" element={<AdminBrandsPage />} />
                <Route path="printer-models" element={<AdminPrinterModelsPage />} />
                <Route path="inventory/*" element={<LegacyInventoryRedirect />} />
              </Route>

              {/* Inventory system: separate workspace, same admin sign-in */}
              <Route
                path="inventory"
                element={
                  <ProtectedAdminRoute>
                    <InventoryLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<InventoryDashboardPage />} />
                <Route path="stock" element={<StockLevelsPage />} />
                <Route path="products/new" element={<AdminProductFormPage />} />
                <Route path="products/:id/edit" element={<AdminProductFormPage />} />
                <Route path="receive" element={<ReceiveStockPage />} />
                <Route path="stock-take" element={<StockTakePage />} />
                <Route path="movements" element={<MovementsPage />} />
                <Route path="sales" element={<SalesHistoryPage />} />
                <Route path="sales/new" element={<RecordSalePage />} />
                <Route path="reports" element={<SalesReportPage />} />
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
                <Route path="account" element={<AccountPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="privacy" element={<PrivacyPolicyPage />} />
                <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CustomerProvider>
      </AdminAuthProvider>
    </CartProvider>
  );
}

export default App;

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CompatibilityFinderPage } from "./pages/CompatibilityFinderPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
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
    </ThemeProvider>
  );
}

export default App;

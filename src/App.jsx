import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import RequireAuth from "./components/RequireAuth";
import RequireVendor from "./components/RequireVendor";
import HomePage from "./pages/HomePage";
import StorePage from "./pages/StorePage";
import DealsPage from "./pages/DealsPage";
import OffersPage from "./pages/OffersPage";
import OrdersPage from "./pages/OrdersPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SellPage from "./pages/SellPage";
import NotFoundPage from "./pages/NotFoundPage";
import VendorLayout from "./components/VendorLayout";
import DashboardPage from "./pages/vendor/DashboardPage";
import InventoryPage from "./pages/vendor/InventoryPage";
import VendorOrdersPage from "./pages/vendor/OrdersPage";
import SettingsPage from "./pages/vendor/SettingsPage";

import { CatalogProvider } from "./context/CatalogContext";
import { InventoryProvider } from "./context/InventoryContext";
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";

// The map library is only downloaded when someone opens order tracking
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));

function CustomerShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {children}
      <CartDrawer />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <InventoryProvider>
        <CartProvider>
          <OrderProvider>
            <Routes>
              <Route path="/" element={<CustomerShell><HomePage /></CustomerShell>} />
              <Route path="/store/:storeId" element={<CustomerShell><StorePage /></CustomerShell>} />
              <Route path="/deals" element={<CustomerShell><DealsPage /></CustomerShell>} />
              <Route path="/offers" element={<CustomerShell><OffersPage /></CustomerShell>} />
              <Route path="/orders" element={<CustomerShell><RequireAuth><OrdersPage /></RequireAuth></CustomerShell>} />
              <Route
                path="/orders/:orderId/track"
                element={
                  <CustomerShell>
                    <RequireAuth>
                      <Suspense fallback={<main className="flex-grow" />}>
                        <TrackOrderPage />
                      </Suspense>
                    </RequireAuth>
                  </CustomerShell>
                }
              />
              <Route path="/checkout" element={<CustomerShell><RequireAuth><CheckoutPage /></RequireAuth></CustomerShell>} />
              <Route path="/login" element={<CustomerShell><LoginPage /></CustomerShell>} />
              <Route path="/signup" element={<CustomerShell><SignupPage /></CustomerShell>} />
              <Route path="/sell" element={<CustomerShell><SellPage /></CustomerShell>} />

              <Route path="/vendor" element={<RequireVendor><VendorLayout /></RequireVendor>}>
                <Route index element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="orders" element={<VendorOrdersPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<CustomerShell><NotFoundPage /></CustomerShell>} />
            </Routes>
          </OrderProvider>
        </CartProvider>
      </InventoryProvider>
    </CatalogProvider>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CookieProvider } from "@/hooks/useCookies";
import { Toaster } from "@/components/ui/sonner";
import CookieBanner from "@/components/CookieBanner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <CookieProvider>
        <AuthProvider>
          <CartProvider>
            <App />
            <CookieBanner />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </CookieProvider>
    </BrowserRouter>
  </StrictMode>
);

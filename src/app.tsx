import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "@/features/auth/login-page";
const Console = lazy(() => import("@/features/console/entry"));
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30000 } },
});
export function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Suspense
          fallback={
            <main className="grid min-h-svh place-items-center" role="status">
              正在加载页面…
            </main>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/workbench/:role?/:page?"
              element={<Console demo={false} />}
            />
            {(import.meta.env.DEV ||
              import.meta.env.VITE_ENABLE_DEMO === "true") && (
              <Route path="/preview/:role?/:page?" element={<Console demo />} />
            )}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

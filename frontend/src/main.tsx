import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Providers } from "./state";
import { DashboardLayout, PublicLayout } from "./components";
import {
  Article,
  Contact,
  FAQ,
  Features,
  Home,
  NotFound,
  Pricing,
} from "./public";
import { AuthPage, RecoveryPage } from "./auth";
import {
  AccountSettings,
  Administration,
  CreditLedger,
  Documents,
  JobDetails,
  NewCheck,
  Notifications,
  Overview,
  Payments,
  PurchaseCredits,
  Referrals,
  Reports,
  Subscriptions,
  Support,
} from "./workspace";
import "./styles.css";

document.documentElement.dataset.theme =
  localStorage.getItem("theme") || "light";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5000 },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Providers>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="features" element={<Features />} />
              {["plagiarism-checker", "ai-detector", "humanizer"].map(
                (path) => (
                  <Route
                    key={path}
                    path={path}
                    element={<Features kind={path} />}
                  />
                ),
              )}
              {[
                "about",
                "how-it-works",
                "privacy",
                "terms",
                "refund-policy",
              ].map((path) => (
                <Route
                  key={path}
                  path={path}
                  element={<Article slug={path} />}
                />
              ))}
              <Route path="faq" element={<FAQ />} />
              <Route path="contact" element={<Contact />} />
              <Route path="forgot-password" element={<RecoveryPage />} />
              <Route path="reset-password" element={<RecoveryPage reset />} />
              <Route path="verify-email" element={<RecoveryPage verify />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="login" element={<AuthPage />} />
            <Route path="register" element={<AuthPage register />} />
            <Route path="app" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="check/:kind" element={<NewCheck />} />
              <Route path="upload" element={<NewCheck />} />
              <Route path="documents" element={<Documents />} />
              <Route path="jobs/:id" element={<JobDetails />} />
              <Route path="reports" element={<Reports />} />
              <Route path="credits" element={<PurchaseCredits />} />
              <Route path="payments" element={<Payments />} />
              <Route path="ledger" element={<CreditLedger />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="support" element={<Support />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="admin" element={<Administration />} />
            </Route>
          </Routes>
        </Providers>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

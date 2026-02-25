import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { WagmiProvider } from "wagmi";
import { store } from "./store/store";
import { config } from "./lib/wagmi";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletPage } from "./pages/WalletPage";
import { GovernancePage } from "./pages/GovernancePage";
import { ProposalDetailsPage } from "./pages/ProposalDetailsPage";
import { ReservesPage } from "./pages/ReservesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { OTPVerificationPage } from "./pages/OTPVerificationPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PrivateRoute } from "./components/PrivateRoute";
import { PublicRoute } from "./components/PublicRoute";
import { PrivateLayout, PublicLayout } from "./components/Layout";
import NotFound from "./pages/NotFound";
import StakePage from "./pages/StakePage";
import Notification from "./components/settings/Notification";
import { TransactionPage } from "./pages/TransactionPage";
import { EmailVerificationPage } from "./pages/EmailVerificationPage";
import KYC from "./pages/KYC";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Private Routes - Require Authentication */}
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <WalletPage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/wallet/transactions"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <TransactionPage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/wallet/kyc"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <KYC />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <GovernancePage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance/proposal/:id"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <ProposalDetailsPage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reserves"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <ReservesPage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <ProfilePage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile/settings"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <SettingsPage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile/notifications"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <Notification />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/stake"
                  element={
                    <PrivateRoute>
                      <PrivateLayout>
                        <StakePage />
                      </PrivateLayout>
                    </PrivateRoute>
                  }
                />

                {/* Public Routes - No Authentication Required */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <PublicLayout>
                        <LoginPage />
                      </PublicLayout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <PublicLayout>
                        <RegisterPage />
                      </PublicLayout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <PublicLayout>
                        <ForgotPasswordPage />
                      </PublicLayout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/otp-verification"
                  element={
                    <PublicRoute>
                      <PublicLayout>
                        <OTPVerificationPage />
                      </PublicLayout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/reset-password/:token"
                  element={
                    <PublicRoute>
                      <PublicLayout>
                        <ResetPasswordPage />
                      </PublicLayout>
                    </PublicRoute>
                  }
                />
                <Route
                  path="/verify-email/:token"
                  element={
                    <PublicRoute>
                      <EmailVerificationPage />
                    </PublicRoute>
                  }
                />

                {/* 404 Route - Available to all */}
                <Route
                  path="*"
                  element={
                    <PublicLayout>
                      <NotFound />
                    </PublicLayout>
                  }
                />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </WagmiProvider>
);

export default App;

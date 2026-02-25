import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider, useSelector } from "react-redux";

import { store } from "./store";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import UserManagement from "./components/UserManagement";
import ReserveManagement from "./components/ReserveManagement";
import CustodianOnboarding from "./components/CustodianOnboarding";
import Governance from "./components/Governance";
import MultiSigQueue from "./components/MultiSigQueue";
import ComplianceAudit from "./components/ComplianceAudit";
import TransactionManagement from "./components/TransactionManagement";
import Settings from "./components/Settings";
import LoginScreen from "./components/LoginScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import UserDetailsProvider from "./components/UserDetailsProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/toaster";
import { Toaster as SonnerToaster } from "./components/ui/sonner";
import { config } from "./utils/utils";

import "./App.css";

const queryClient = new QueryClient();

// Main Layout Component
function MainLayout() {
  const { role } = useSelector((state) => state.auth);

  return (
    <div className="App flex h-screen bg-gray-50 dark:bg-gray-900 font-inter overflow-hidden">
      <Sidebar userRole={role} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/reserves" element={<ReserveManagement />} />
          <Route path="/custodians" element={<CustodianOnboarding />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/multisig" element={<MultiSigQueue />} />
          <Route path="/compliance" element={<ComplianceAudit />} />
          <Route path="/transactions" element={<TransactionManagement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <Toaster />
      <SonnerToaster />
    </div>
  );
}

// App Router Component (needs to be inside Provider to access Redux)
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route - Login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <div className="App">
                <LoginScreen />
                <Toaster />
              </div>
            </PublicRoute>
          }
        />

        {/* Protected Routes - Main Application */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <UserDetailsProvider>
                <MainLayout />
              </UserDetailsProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="icc-admin-theme">
          <Provider store={store}>
            <AppRouter />
          </Provider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Users,
  Shield,
  Coins,
  Building,
  Vote,
  ClipboardList,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CreditCard,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { logout } from "../store/slices/authSlice";
import { WalletConnect } from "./WalletConnectButton";
import logo from "../assets/IC_logo_n.png";

const Sidebar = ({ userRole = "super_admin" }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const handleLogout = () => {
    dispatch(logout());
  };

  const menuItems = {
    super_admin: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      { id: "users", label: "User & KYC", icon: Users, path: "/users" },
      {
        id: "reserves",
        label: "Reserve Management",
        icon: Shield,
        path: "/reserves",
      },
      {
        id: "custodians",
        label: "Custodian Onboarding",
        icon: Building,
        path: "/custodians",
      },
      {
        id: "governance",
        label: "Governance",
        icon: Vote,
        path: "/governance",
      },
      {
        id: "multisig",
        label: "Multi-Sig Queue",
        icon: ClipboardList,
        path: "/multisig",
      },
      {
        id: "compliance",
        label: "Compliance & Audit",
        icon: FileText,
        path: "/compliance",
      },
      {
        id: "transactions",
        label: "Transaction Management",
        icon: CreditCard,
        path: "/transactions",
      },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
    compliance_officer: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      { id: "users", label: "User & KYC", icon: Users, path: "/users" },
      {
        id: "compliance",
        label: "Compliance & Audit",
        icon: FileText,
        path: "/compliance",
      },
    ],
    treasury_manager: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      {
        id: "reserves",
        label: "Reserve Management",
        icon: Shield,
        path: "/reserves",
      },
      {
        id: "custodians",
        label: "Custodians",
        icon: Building,
        path: "/custodians",
      },
      {
        id: "multisig",
        label: "Multi-Sig Queue",
        icon: ClipboardList,
        path: "/multisig",
      },
    ],
  };

  const currentMenuItems = menuItems[userRole] || menuItems.super_admin;

  return (
    <div
      className={cn(
        "h-screen bg-ic-blue text-white transition-all duration-300 flex flex-col font-inter",
        collapsed ? "w-16" : "w-72"
      )}
    >
      {/* Header */}
      <div className=" border-b border-white/10 flex items-center justify-between relative">
        {!collapsed && <img src={logo} alt="logo" className="w-full" />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={`text-white/70 hover:text-white hover:bg-white/0 p-2 rounded-lg  right-0 ${
            collapsed ? " m-auto" : "absolute translate-y-1"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {currentMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center w-full justify-start text-left font-inter font-medium transition-all duration-200 rounded-lg",
                isActive
                  ? "bg-white/10 text-white border-r-2 border-ic-gold"
                  : "text-white/70 hover:text-white hover:bg-white/5",
                collapsed ? "px-2 py-2" : "px-4 py-3"
              )}
            >
              <Icon className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex flex-col justify-between gap-2">
        {!collapsed && <WalletConnect />}
        {!collapsed && user && (
          <div className=" px-2">
            <div className="text-white/90 text-sm font-medium truncate">
              {user.fullName || user.email}
            </div>
            <div className="text-white/60 text-xs truncate">{user.email}</div>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-white/70 hover:text-white hover:bg-white/5 font-inter font-medium",
            collapsed ? "px-2" : "px-4 py-3"
          )}
        >
          <LogOut className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;

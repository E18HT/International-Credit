import { NavLink } from "react-router-dom";
import { Wallet, Vote, Shield, User } from "lucide-react";
import { useAppSelector } from "@/hooks/useRedux";
import { RootState } from "@/store/store";

const navigationItems = [
  { path: "/", icon: Wallet, label: "Wallet" },
  { path: "/governance", icon: Vote, label: "Governance" },
  { path: "/reserves", icon: Shield, label: "Reserves" },
  { path: "/profile", icon: User, label: "Profile" },
];

export const BottomNavigation = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navigationItems.map(({ path, icon: Icon, label }) => {
          if (
            label === "Governance" &&
            user?.identity?.adminApproval?.status !== "approved"
          ) {
            return null;
          }
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 ic-caption transition-all duration-200 ${
                  isActive
                    ? "text-ic-blue font-semibold"
                    : "text-gray-500 hover:text-ic-blue-light"
                }`
              }
            >
              <Icon className="w-5 h-5 mb-1 transition-colors" />
              <span className="truncate font-inter text-xs">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

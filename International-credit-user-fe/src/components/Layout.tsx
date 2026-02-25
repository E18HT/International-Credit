import { BottomNavigation } from "./BottomNavigation";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { OfflineIndicator } from "./OfflineIndicator";

interface LayoutProps {
  children: React.ReactNode;
  showBottomNavigation?: boolean;
}

/**
 * Layout component that wraps page content
 * Conditionally shows bottom navigation based on route type
 */
export const Layout = ({ children, showBottomNavigation = false }: LayoutProps) => {
  return (
    <div className="relative">
      <OfflineIndicator />
      {children}
      {showBottomNavigation && <BottomNavigation />}
      <PWAInstallPrompt />
    </div>
  );
};

/**
 * Layout for private/authenticated routes
 * Includes bottom navigation
 */
export const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout showBottomNavigation={true}>
      {children}
    </Layout>
  );
};

/**
 * Layout for public/unauthenticated routes
 * No bottom navigation
 */
export const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout showBottomNavigation={false}>
      {children}
    </Layout>
  );
};

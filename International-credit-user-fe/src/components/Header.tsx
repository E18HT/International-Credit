import { NotificationDropdown } from "./NotificationDropdown";
import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
}

export const Header = ({ title, subtitle, rightElement }: HeaderProps) => {
  return (
    <header className="bg-gradient-to-r from-primary to-primary px-6 py-8 text-white shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2">{rightElement}</div>
          <div>
            <h1 className="ic-heading-1 text-white font-poppins">{title}</h1>
            {subtitle && (
              <p className="text-white/90 ic-body-small mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { ComplianceSettings } from "@/components/settings/ComplianceSettings";
import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { useNavigate } from "react-router-dom";
import { Accordion } from "@/components/ui/accordion";

export const SettingsPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Account Settings"
        subtitle="Manage your account preferences"
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        }
      />

      <div className="px-6 -mt-4 max-w-md mx-auto">
        <Card className="shadow-elevated">
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              <SecuritySettings />
              <PreferencesSettings />
              <ComplianceSettings />
              <AdvancedSettings />
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

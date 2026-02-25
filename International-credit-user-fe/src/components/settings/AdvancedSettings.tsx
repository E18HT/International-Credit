import { useEffect, useState } from "react";
import {
  Settings,
  Trash2,
  Download,
  AlertTriangle,
  FileText,
  Database,
  Lock,
  Calendar,
  CheckCircle,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useLazyExportUsersQuery } from "@/store/api/userProfileApi";

export const AdvancedSettings = () => {
  const [exportUsers, { data: fileBlob, isFetching }] =
    useLazyExportUsersQuery();
  useEffect(() => {
    if (fileBlob instanceof Blob) {
      const ext =
        fileBlob.type === "text/csv"
          ? "csv"
          : fileBlob.type.includes("json")
          ? "json"
          : "bin";
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-export-${
        new Date().toISOString().split("T")[0]
      }.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Download started", { description: `Exported as .${ext}` });
    }
  }, [fileBlob]);

  return (
    <AccordionItem value="advanced">
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <span className="font-medium">Advanced</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-6">
          {/* Export Data */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">Export Data</h3>
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800 mb-2">
                      Download Your Data
                    </p>
                    <p className="text-sm text-blue-600 mb-4">
                      Export your transaction history, governance participation,
                      and other account data in a portable format.
                    </p>

                    {/* Data Overview */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-blue-800">
                        Available Data:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-white rounded border border-blue-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium">
                                Transactions
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded border border-blue-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium">Governance</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => exportUsers({ format: "csv" })}
                  disabled={isFetching}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isFetching ? "Exporting..." : "Export My Data"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

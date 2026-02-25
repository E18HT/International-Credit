import React from "react";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";
import Layout from "./Layout/Layout";
import Stats from "./custodian/Stats";
import AddCustodian from "./custodian/AddCustodian";
import CustodianDataTable from "./Table/CustodianDataTable";
import { useGetCustodiansQuery } from "../store/api/custodianApiSlice";

const CustodianOnboarding = () => {
  const { toast } = useToast();

  // API call to get custodians with default sorting by last_action_at:desc
  const {
    data: custodiansData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetCustodiansQuery({
    limit: 20,
    sort: "last_action_at:desc",
  });

  const custodians = custodiansData?.custodians || [];

  /**
   * Handles custodian status change (approve/reject/suspend/reactivate)
   * Shows success toast and refetches data to update UI
   * Note: Actual API mutation should be implemented here
   */
  const handleStatusChange = (custodianId, newStatus) => {
    toast({
      title: "Success",
      description: `Custodian status updated to ${newStatus}`,
    });

    // Refetch custodians list to reflect status change
    refetch();
  };

  return (
    <Layout title="Custodian Management" ButtonComponent={<AddCustodian />}>
      {/* Stats Cards */}
      <Stats />

      {/* Custodians Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Custodians (
              {isLoading
                ? "0"
                : custodiansData?.totalCustodians || custodians.items?.length}
              )
            </span>
            {isLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading...
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load custodians</p>
                <p className="text-sm text-gray-500 mt-1">
                  {error?.data?.message ||
                    error?.message ||
                    "Unknown error occurred"}
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <CustodianDataTable
              refetch={refetch}
              custodians={custodians.items || []}
              isLoading={isLoading}
              onApproveCustodian={(custodianId) =>
                handleStatusChange(custodianId, "active")
              }
              onRejectCustodian={(custodianId) =>
                handleStatusChange(custodianId, "rejected")
              }
              onSuspendCustodian={(custodianId) =>
                handleStatusChange(custodianId, "suspended")
              }
              onReactivateCustodian={(custodianId) =>
                handleStatusChange(custodianId, "active")
              }
              enableApiPagination={false}
            />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default CustodianOnboarding;

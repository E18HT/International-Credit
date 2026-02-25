import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import BalanceBox from "@/components/Governance/BalanceBox";
import CreateProposal from "@/components/Governance/CreateProposal";
import { useGetProposalsQuery, Proposal } from "@/store/api/governanceApi";
import GovCard from "@/components/Governance/GovCard";
import { Button } from "@/components/ui/button";

export const GovernancePage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const {
    data: proposalsData,
    isLoading,
    isFetching,
  } = useGetProposalsQuery({
    page: currentPage,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Update all proposals when new data arrives
  useEffect(() => {
    if (proposalsData?.proposals) {
      if (currentPage === 1) {
        setAllProposals(proposalsData.proposals);
      } else {
        setAllProposals((prev) => [...prev, ...proposalsData.proposals]);
      }
      setHasMore(
        proposalsData.pagination.page < proposalsData.pagination.pages
      );
    }
  }, [proposalsData, currentPage]);

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header
        title="DAO Governance"
        subtitle="Shape the future of International Credit"
      />

      {/* Fixed header content */}
      <div className="px-2 -mt-4 max-w-md w-full mx-auto flex-shrink-0">
        {/* Voting Power */}
        <BalanceBox />
        <CreateProposal />
      </div>

      {/* Scrollable proposals list */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-2 max-w-md mx-auto pb-[70px]">
          {/* Proposals */}
          <div className="space-y-4">
            {isLoading && currentPage === 1 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : allProposals.length > 0 ? (
              <>
                {allProposals.map((proposal) => (
                  <GovCard proposal={proposal} key={proposal._id} />
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      variant="outline"
                      className="w-full max-w-xs"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Load More
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Show total count */}
                {proposalsData?.pagination && (
                  <div className="text-center text-xs text-gray-500 pt-2">
                    Showing {allProposals.length} of{" "}
                    {proposalsData.pagination.total} proposals
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8">
                No proposals found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Governance related types
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status:
    | "pending"
    | "active"
    | "succeeded"
    | "defeated"
    | "queued"
    | "executed"
    | "cancelled";
  type: "parameter_change" | "upgrade" | "treasury" | "general";
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  quorum: number;
  threshold: number;
  startTime: string;
  endTime: string;
  executionTime?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    category?: string;
    priority?: "low" | "medium" | "high" | "critical";
    estimatedCost?: number;
    implementationPeriod?: string;
  };
}

export interface ProposalData {
  proposals: Proposal[];
  totalProposals: number;
  activeProposals: number;
  pendingProposals: number;
  completedProposals: number;
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  type: Proposal["type"];
  metadata?: Proposal["metadata"];
}

export interface VoteRequest {
  proposalId: string;
  support: boolean; // true for yes, false for no
  reason?: string;
}

export interface ProposalFilters {
  status?: Proposal["status"];
  type?: Proposal["type"];
  search?: string;
  page?: number;
  limit?: number;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  userVotes: number;
  participationRate: number;
  votingPower: number;
}

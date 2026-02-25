import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Proposal {
  proposalId: number;
  description: string;
  proposer: string;
  forVotes: number;
  passed: boolean;
  expired: boolean;
  createdAt: number;
  passedAt: number;
  votingDeadline: number;
}

export interface Vote {
  proposalId: number;
  voter: string;
  hasVoted: boolean;
}

export interface GovernanceState {
  proposals: Proposal[];
  activeProposals: Proposal[];
  passedProposals: Proposal[];
  expiredProposals: Proposal[];
  votes: { [proposalId: number]: Vote[] };
  selectedProposal: Proposal | null;
  isCreatingProposal: boolean;
  isVoting: boolean;
  votingPeriod: number; // in days, default 7
  error: string | null;
}

const initialState: GovernanceState = {
  proposals: [],
  activeProposals: [],
  passedProposals: [],
  expiredProposals: [],
  votes: {},
  selectedProposal: null,
  isCreatingProposal: false,
  isVoting: false,
  votingPeriod: 7,
  error: null,
};

const governanceSlice = createSlice({
  name: "governance",
  initialState,
  reducers: {
    setProposals: (state, action: PayloadAction<Proposal[]>) => {
      state.proposals = action.payload;
      // Categorize proposals
      const now = Math.floor(Date.now() / 1000);
      state.activeProposals = action.payload.filter(
        (p) => !p.passed && !p.expired && p.votingDeadline > now
      );
      state.passedProposals = action.payload.filter((p) => p.passed);
      state.expiredProposals = action.payload.filter((p) => p.expired);
    },

    addProposal: (state, action: PayloadAction<Proposal>) => {
      state.proposals.push(action.payload);
      // Add to active proposals if not passed/expired
      if (!action.payload.passed && !action.payload.expired) {
        state.activeProposals.push(action.payload);
      }
    },

    updateProposal: (state, action: PayloadAction<Proposal>) => {
      const index = state.proposals.findIndex(
        (p) => p.proposalId === action.payload.proposalId
      );
      if (index !== -1) {
        state.proposals[index] = action.payload;
        // Update categorized lists
        const now = Math.floor(Date.now() / 1000);
        state.activeProposals = state.proposals.filter(
          (p) => !p.passed && !p.expired && p.votingDeadline > now
        );
        state.passedProposals = state.proposals.filter((p) => p.passed);
        state.expiredProposals = state.proposals.filter((p) => p.expired);
      }
    },

    setSelectedProposal: (state, action: PayloadAction<Proposal | null>) => {
      state.selectedProposal = action.payload;
    },

    setVotes: (
      state,
      action: PayloadAction<{ proposalId: number; votes: Vote[] }>
    ) => {
      state.votes[action.payload.proposalId] = action.payload.votes;
    },

    addVote: (state, action: PayloadAction<Vote>) => {
      const { proposalId } = action.payload;
      if (!state.votes[proposalId]) {
        state.votes[proposalId] = [];
      }

      // Check if vote already exists for this voter
      const existingVoteIndex = state.votes[proposalId].findIndex(
        (v) => v.voter === action.payload.voter
      );

      if (existingVoteIndex !== -1) {
        state.votes[proposalId][existingVoteIndex] = action.payload;
      } else {
        state.votes[proposalId].push(action.payload);
      }

      // Update proposal vote count
      const proposalIndex = state.proposals.findIndex(
        (p) => p.proposalId === proposalId
      );
      if (proposalIndex !== -1) {
        state.proposals[proposalIndex].forVotes = state.votes[
          proposalId
        ].filter((v) => v.hasVoted).length;

        // Auto-pass if 3 votes reached
        if (
          state.proposals[proposalIndex].forVotes >= 3 &&
          !state.proposals[proposalIndex].passed
        ) {
          state.proposals[proposalIndex].passed = true;
          state.proposals[proposalIndex].passedAt = Math.floor(
            Date.now() / 1000
          );
        }
      }
    },

    setCreatingProposal: (state, action: PayloadAction<boolean>) => {
      state.isCreatingProposal = action.payload;
    },

    setVoting: (state, action: PayloadAction<boolean>) => {
      state.isVoting = action.payload;
    },

    setVotingPeriod: (state, action: PayloadAction<number>) => {
      // Validate voting period (1-30 days)
      if (action.payload >= 1 && action.payload <= 30) {
        state.votingPeriod = action.payload;
      }
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Helper actions for proposal status
    expireProposal: (state, action: PayloadAction<number>) => {
      const proposalIndex = state.proposals.findIndex(
        (p) => p.proposalId === action.payload
      );
      if (proposalIndex !== -1) {
        state.proposals[proposalIndex].expired = true;
        // Remove from active proposals
        state.activeProposals = state.activeProposals.filter(
          (p) => p.proposalId !== action.payload
        );
        // Add to expired proposals
        const expiredProposal = state.proposals[proposalIndex];
        if (
          !state.expiredProposals.find((p) => p.proposalId === action.payload)
        ) {
          state.expiredProposals.push(expiredProposal);
        }
      }
    },
  },
});

export const {
  setProposals,
  addProposal,
  updateProposal,
  setSelectedProposal,
  setVotes,
  addVote,
  setCreatingProposal,
  setVoting,
  setVotingPeriod,
  setError,
  clearError,
  expireProposal,
} = governanceSlice.actions;

export default governanceSlice.reducer;

// Selectors
export const selectAllProposals = (state: { governance: GovernanceState }) =>
  state.governance.proposals;

export const selectActiveProposals = (state: { governance: GovernanceState }) =>
  state.governance.activeProposals;

export const selectPassedProposals = (state: { governance: GovernanceState }) =>
  state.governance.passedProposals;

export const selectExpiredProposals = (state: {
  governance: GovernanceState;
}) => state.governance.expiredProposals;

export const selectProposalById =
  (proposalId: number) => (state: { governance: GovernanceState }) =>
    state.governance.proposals.find((p) => p.proposalId === proposalId);

export const selectVotesByProposalId =
  (proposalId: number) => (state: { governance: GovernanceState }) =>
    state.governance.votes[proposalId] || [];

export const selectIsVotingActive =
  (proposalId: number) => (state: { governance: GovernanceState }) => {
    const proposal = state.governance.proposals.find(
      (p) => p.proposalId === proposalId
    );
    if (!proposal) return false;

    const now = Math.floor(Date.now() / 1000);
    return (
      !proposal.passed && !proposal.expired && proposal.votingDeadline > now
    );
  };

export const selectRemainingVotingTime =
  (proposalId: number) => (state: { governance: GovernanceState }) => {
    const proposal = state.governance.proposals.find(
      (p) => p.proposalId === proposalId
    );
    if (!proposal) return 0;

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, proposal.votingDeadline - now);
  };

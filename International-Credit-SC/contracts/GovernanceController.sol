// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for ICGOVT token to check voting power
interface IICGOVT {
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title GovernanceController
 * @dev 4-actor governance system for the IC protocol
 * @notice Manages proposals and voting for the IC system with a fixed set of governance actors
 */
contract GovernanceController is ReentrancyGuard {

    /// @notice Structure to represent a governance proposal
    struct Proposal {
        address proposer;           // Address that created the proposal
        string description;         // Human-readable description of the proposal
        uint256 forVotes;          // Number of actors who voted for the proposal
        uint256 againstVotes;      // Number of actors who voted against the proposal
        bool passed;               // Whether the proposal has passed (auto-executed)
        bool failed;               // Whether the proposal has failed (majority against)
        bool tied;                 // Whether the proposal ended in a 2-2 tie
        bool expired;              // Whether the proposal has expired without passing
        uint256 createdAt;         // Timestamp when proposal was created
        uint256 passedAt;          // Timestamp when proposal passed (0 if not passed)
        uint256 votingDeadline;    // Timestamp when voting period ends
    }

    /// @notice Array of all proposals
    Proposal[] public proposals;

    /// @notice Mapping to track if an actor has voted on a specific proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Mapping to track how an actor voted (true = for, false = against)
    mapping(uint256 => mapping(address => bool)) public voteDirection;

    /// @notice Fixed array of four governance actors
    address[4] public actors;

    /// @notice Reference to the ICGOVT token contract
    IICGOVT public icgovtToken;

    /// @notice Minimum votes required to execute a proposal (3 out of 4)
    uint256 public constant REQUIRED_VOTES = 3;

    /// @notice Total number of governance actors
    uint256 public constant TOTAL_ACTORS = 4;
    
    /// @notice Default voting period (7 days)
    uint256 public votingPeriod = 7 days;
    
    /// @notice Minimum voting period (1 day)
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    
    /// @notice Maximum voting period (30 days)
    uint256 public constant MAX_VOTING_PERIOD = 30 days;

    /// @notice Emitted when a new proposal is created
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );

    /// @notice Emitted when an actor votes on a proposal
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );

    /// @notice Emitted when a proposal automatically passes
    event ProposalPassed(
        uint256 indexed proposalId,
        address indexed finalVoter,
        uint256 finalVoteCount
    );

    /// @notice Emitted when a proposal fails to get enough votes
    event ProposalFailed(
        uint256 indexed proposalId,
        uint256 finalVoteCount
    );
    
    /// @notice Emitted when a proposal expires
    event ProposalExpired(
        uint256 indexed proposalId,
        uint256 finalVoteCount
    );
    
    /// @notice Emitted when a proposal ends in a tie (2-2 votes)
    event ProposalTied(
        uint256 indexed proposalId,
        uint256 forVotes,
        uint256 againstVotes
    );
    
    /// @notice Emitted when voting period is updated
    event VotingPeriodUpdated(
        uint256 oldPeriod,
        uint256 newPeriod,
        address indexed updatedBy
    );

    /**
     * @dev Constructor sets the four governance actors and ICGOVT token
     * @param _investor Address of the investor actor
     * @param _advisor Address of the advisor actor
     * @param _team Address of the team actor
     * @param _custodian Address of the custodian actor
     * @param _icgovtToken Address of the ICGOVT token contract
     */
    constructor(
        address _investor,
        address _advisor,
        address _team,
        address _custodian,
        address _icgovtToken
    ) {
        require(_investor != address(0), "GovernanceController: Investor cannot be zero address");
        require(_advisor != address(0), "GovernanceController: Advisor cannot be zero address");
        require(_team != address(0), "GovernanceController: Team cannot be zero address");
        require(_custodian != address(0), "GovernanceController: Custodian cannot be zero address");
        require(_icgovtToken != address(0), "GovernanceController: ICGOVT token cannot be zero address");

        // Ensure all actors are unique
        require(_investor != _advisor && _investor != _team && _investor != _custodian, 
                "GovernanceController: Duplicate investor address");
        require(_advisor != _team && _advisor != _custodian, 
                "GovernanceController: Duplicate advisor address");
        require(_team != _custodian, 
                "GovernanceController: Duplicate team address");

        actors[0] = _investor;
        actors[1] = _advisor;
        actors[2] = _team;
        actors[3] = _custodian;

        icgovtToken = IICGOVT(_icgovtToken);
    }

    /**
     * @notice Creates a new governance proposal
     * @dev Only callable by one of the four governance actors
     * @param _description Human-readable description of the proposal (any category)
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        string memory _description
    ) external returns (uint256 proposalId) {
        require(isActor(msg.sender), "GovernanceController: Only actors can create proposals");
        require(bytes(_description).length > 0, "GovernanceController: Description cannot be empty");
        require(icgovtToken.balanceOf(msg.sender) > 0, "GovernanceController: Must hold ICGOVT tokens to create proposals");

        proposalId = proposals.length;
        
        uint256 deadline = block.timestamp + votingPeriod;
        
        proposals.push(Proposal({
            proposer: msg.sender,
            description: _description,
            forVotes: 0,
            againstVotes: 0,
            passed: false,
            failed: false,
            tied: false,
            expired: false,
            createdAt: block.timestamp,
            passedAt: 0,
            votingDeadline: deadline
        }));

        emit ProposalCreated(proposalId, msg.sender, _description);
    }

    /**
     * @notice Votes on a governance proposal
     * @dev Only callable by governance actors who hold ICGOVT tokens and haven't voted yet
     * @param _proposalId ID of the proposal to vote on
     * @param _support True to vote for, false to vote against
     */
    function vote(uint256 _proposalId, bool _support) external {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        require(isActor(msg.sender), "GovernanceController: Only actors can vote");
        require(!hasVoted[_proposalId][msg.sender], "GovernanceController: Actor has already voted");
        require(icgovtToken.balanceOf(msg.sender) > 0, "GovernanceController: Must hold ICGOVT tokens to vote");
        require(!proposals[_proposalId].passed, "GovernanceController: Proposal already passed");
        require(!proposals[_proposalId].failed, "GovernanceController: Proposal already failed");
        require(!proposals[_proposalId].tied, "GovernanceController: Proposal already tied");
        require(!proposals[_proposalId].expired, "GovernanceController: Proposal already expired");
        require(block.timestamp <= proposals[_proposalId].votingDeadline, "GovernanceController: Voting period has ended");

        hasVoted[_proposalId][msg.sender] = true;
        voteDirection[_proposalId][msg.sender] = _support;
        
        if (_support) {
            proposals[_proposalId].forVotes++;
        } else {
            proposals[_proposalId].againstVotes++;
        }

        emit VoteCast(_proposalId, msg.sender, _support);

        // Check total votes cast
        uint256 totalVotes = proposals[_proposalId].forVotes + proposals[_proposalId].againstVotes;

        // Auto-execute if majority reached (3 out of 4 votes)
        if (proposals[_proposalId].forVotes >= REQUIRED_VOTES) {
            proposals[_proposalId].passed = true;
            proposals[_proposalId].passedAt = block.timestamp;
            
            emit ProposalPassed(_proposalId, msg.sender, proposals[_proposalId].forVotes);
        } else if (proposals[_proposalId].againstVotes >= REQUIRED_VOTES) {
            proposals[_proposalId].failed = true;
            
            emit ProposalFailed(_proposalId, proposals[_proposalId].againstVotes);
        } else if (totalVotes == TOTAL_ACTORS && proposals[_proposalId].forVotes == 2 && proposals[_proposalId].againstVotes == 2) {
            // All actors have voted and it's a 2-2 tie
            proposals[_proposalId].tied = true;
            
            emit ProposalTied(_proposalId, proposals[_proposalId].forVotes, proposals[_proposalId].againstVotes);
        }
    }

    /**
     * @notice Checks if a proposal has passed
     * @param _proposalId ID of the proposal to check
     * @return True if the proposal has passed
     */
    function hasProposalPassed(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return proposals[_proposalId].passed;
    }

    /**
     * @notice Gets the current vote count for a proposal
     * @param _proposalId ID of the proposal
     * @return Current number of for votes
     */
    function getProposalVotes(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return proposals[_proposalId].forVotes;
    }

    /**
     * @notice Gets the current against vote count for a proposal
     * @param _proposalId ID of the proposal
     * @return Current number of against votes
     */
    function getProposalAgainstVotes(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return proposals[_proposalId].againstVotes;
    }

    /**
     * @notice Gets both for and against vote counts for a proposal
     * @param _proposalId ID of the proposal
     * @return forVotes Current number of for votes
     * @return againstVotes Current number of against votes
     */
    function getProposalVoteCounts(uint256 _proposalId) external view returns (uint256 forVotes, uint256 againstVotes) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return (proposals[_proposalId].forVotes, proposals[_proposalId].againstVotes);
    }

    /**
     * @notice Checks if an address is one of the four governance actors
     * @param _address Address to check
     * @return True if the address is a governance actor
     */
    function isActor(address _address) public view returns (bool) {
        for (uint256 i = 0; i < TOTAL_ACTORS; i++) {
            if (actors[i] == _address) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Gets the total number of proposals
     * @return Total number of proposals created
     */
    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    /**
     * @notice Gets detailed information about a proposal
     * @param _proposalId ID of the proposal
     * @return proposer Address that created the proposal
     * @return description Human-readable description
     * @return forVotes Number of votes for the proposal
     * @return againstVotes Number of votes against the proposal
     * @return passed Whether the proposal has passed
     * @return failed Whether the proposal has failed
     * @return tied Whether the proposal ended in a 2-2 tie
     * @return expired Whether the proposal has expired
     * @return createdAt Timestamp when proposal was created
     * @return passedAt Timestamp when proposal passed (0 if not passed)
     * @return votingDeadline Timestamp when voting period ends
     */
    function getProposal(uint256 _proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        bool passed,
        bool failed,
        bool tied,
        bool expired,
        uint256 createdAt,
        uint256 passedAt,
        uint256 votingDeadline
    ) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.passed,
            proposal.failed,
            proposal.tied,
            proposal.expired,
            proposal.createdAt,
            proposal.passedAt,
            proposal.votingDeadline
        );
    }

    /**
     * @notice Gets all four governance actor addresses
     * @return Array of all governance actor addresses
     */
    function getActors() external view returns (address[4] memory) {
        return actors;
    }

    /**
     * @notice Gets all active (not passed and not expired) proposals
     * @return Array of proposal IDs that are still active
     */
    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active proposals
        for (uint256 i = 0; i < proposals.length; i++) {
            if (!proposals[i].passed && !proposals[i].failed && !proposals[i].tied && !proposals[i].expired && block.timestamp <= proposals[i].votingDeadline) {
                activeCount++;
            }
        }
        
        // Create array of active proposal IDs
        uint256[] memory activeProposals = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (!proposals[i].passed && !proposals[i].failed && !proposals[i].tied && !proposals[i].expired && block.timestamp <= proposals[i].votingDeadline) {
                activeProposals[index] = i;
                index++;
            }
        }
        
        return activeProposals;
    }

    /**
     * @notice Gets all passed proposals
     * @return Array of proposal IDs that have passed
     */
    function getPassedProposals() external view returns (uint256[] memory) {
        uint256 passedCount = 0;
        
        // Count passed proposals
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].passed) {
                passedCount++;
            }
        }
        
        // Create array of passed proposal IDs
        uint256[] memory passedProposals = new uint256[](passedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].passed) {
                passedProposals[index] = i;
                index++;
            }
        }
        
        return passedProposals;
    }

    /**
     * @notice Gets all failed proposals
     * @return Array of proposal IDs that have failed
     */
    function getFailedProposals() external view returns (uint256[] memory) {
        uint256 failedCount = 0;
        
        // Count failed proposals
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].failed) {
                failedCount++;
            }
        }
        
        // Create array of failed proposal IDs
        uint256[] memory failedProposals = new uint256[](failedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].failed) {
                failedProposals[index] = i;
                index++;
            }
        }
        
        return failedProposals;
    }

    /**
     * @notice Gets all tied proposals (2-2 votes)
     * @return Array of proposal IDs that ended in a tie
     */
    function getTiedProposals() external view returns (uint256[] memory) {
        uint256 tiedCount = 0;
        
        // Count tied proposals
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].tied) {
                tiedCount++;
            }
        }
        
        // Create array of tied proposal IDs
        uint256[] memory tiedProposals = new uint256[](tiedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].tied) {
                tiedProposals[index] = i;
                index++;
            }
        }
        
        return tiedProposals;
    }
    
    /**
     * @notice Expires a proposal that has passed its voting deadline without reaching majority
     * @param _proposalId ID of the proposal to expire
     */
    function expireProposal(uint256 _proposalId) external {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.passed, "GovernanceController: Proposal already passed");
        require(!proposal.failed, "GovernanceController: Proposal already failed");
        require(!proposal.tied, "GovernanceController: Proposal already tied");
        require(!proposal.expired, "GovernanceController: Proposal already expired");
        require(block.timestamp > proposal.votingDeadline, "GovernanceController: Voting period still active");
        
        proposal.expired = true;
        emit ProposalExpired(_proposalId, proposal.forVotes);
    }
    
    /**
     * @notice Gets all expired proposals
     * @return Array of proposal IDs that have expired
     */
    function getExpiredProposals() external view returns (uint256[] memory) {
        uint256 expiredCount = 0;
        
        // Count expired proposals
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].expired || (!proposals[i].passed && !proposals[i].failed && !proposals[i].tied && block.timestamp > proposals[i].votingDeadline)) {
                expiredCount++;
            }
        }
        
        // Create array of expired proposal IDs
        uint256[] memory expiredProposals = new uint256[](expiredCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].expired || (!proposals[i].passed && !proposals[i].failed && !proposals[i].tied && block.timestamp > proposals[i].votingDeadline)) {
                expiredProposals[index] = i;
                index++;
            }
        }
        
        return expiredProposals;
    }
    
    /**
     * @notice Updates the voting period for new proposals
     * @dev Only callable by actors through a passed proposal (governance decision)
     * @param _newVotingPeriod New voting period in seconds
     */
    function updateVotingPeriod(uint256 _newVotingPeriod) external {
        require(isActor(msg.sender), "GovernanceController: Only actors can update voting period");
        require(_newVotingPeriod >= MIN_VOTING_PERIOD, "GovernanceController: Voting period too short");
        require(_newVotingPeriod <= MAX_VOTING_PERIOD, "GovernanceController: Voting period too long");
        
        uint256 oldPeriod = votingPeriod;
        votingPeriod = _newVotingPeriod;
        
        emit VotingPeriodUpdated(oldPeriod, _newVotingPeriod, msg.sender);
    }
    
    /**
     * @notice Checks if a proposal is still within its voting period
     * @param _proposalId ID of the proposal to check
     * @return True if voting period is still active
     */
    function isVotingActive(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        return !proposal.passed && !proposal.failed && !proposal.tied && !proposal.expired && block.timestamp <= proposal.votingDeadline;
    }
    
    /**
     * @notice Gets the remaining time for voting on a proposal
     * @param _proposalId ID of the proposal
     * @return Remaining seconds for voting (0 if expired)
     */
    function getRemainingVotingTime(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.passed || proposal.failed || proposal.tied || proposal.expired || block.timestamp > proposal.votingDeadline) {
            return 0;
        }
        
        return proposal.votingDeadline - block.timestamp;
    }

    /**
     * @notice Checks if a proposal has failed (majority voted against)
     * @param _proposalId ID of the proposal to check
     * @return True if the proposal has failed
     */
    function hasProposalFailed(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return proposals[_proposalId].failed;
    }

    /**
     * @notice Checks if a proposal ended in a tie (2-2 votes)
     * @param _proposalId ID of the proposal to check
     * @return True if the proposal ended in a tie
     */
    function hasProposalTied(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        return proposals[_proposalId].tied;
    }

    /**
     * @notice Gets how a specific actor voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _actor Address of the actor
     * @return actorHasVoted True if the actor has voted
     * @return support True if voted for, false if voted against (only valid if actorHasVoted is true)
     */
    function getActorVote(uint256 _proposalId, address _actor) external view returns (bool actorHasVoted, bool support) {
        require(_proposalId < proposals.length, "GovernanceController: Invalid proposal ID");
        actorHasVoted = hasVoted[_proposalId][_actor];
        support = voteDirection[_proposalId][_actor];
        return (actorHasVoted, support);
    }
}

// Mock data for Universal Credit Admin Panel

export const mockUsers = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    country: "USA",
    kycStatus: "approved",
    walletStatus: "active",
    joinDate: "2024-01-15",
    lastActive: "2024-09-20",
  },
  {
    id: 2,
    name: "Bob Chen",
    email: "bob@example.com",
    country: "Singapore",
    kycStatus: "pending",
    walletStatus: "active",
    joinDate: "2024-02-10",
    lastActive: "2024-09-19",
  },
  {
    id: 3,
    name: "Carol Davis",
    email: "carol@example.com",
    country: "UK",
    kycStatus: "rejected",
    walletStatus: "suspended",
    joinDate: "2024-03-05",
    lastActive: "2024-09-15",
  },
];

export const mockReserveData = {
  btcReserve: 45.7,
  goldReserve: 54.3,
  totalValue: 2450000,
  collateralizationRatio: 125.8,
  lastUpdate: "2024-09-20T10:30:00Z",
};

export const mockProposals = [
  {
    id: 1,
    title: "Increase Gold Reserve Ratio",
    status: "active",
    votesFor: 67,
    votesAgainst: 23,
    quorum: 75,
    endDate: "2024-09-25",
    type: "treasury",
  },
  {
    id: 2,
    title: "Add New Custodian Partner",
    status: "approved",
    votesFor: 89,
    votesAgainst: 11,
    quorum: 75,
    endDate: "2024-09-18",
    type: "governance",
  },
  {
    id: 3,
    title: "Emergency Protocol Update",
    status: "pending",
    votesFor: 45,
    votesAgainst: 15,
    quorum: 75,
    endDate: "2024-09-30",
    type: "emergency",
  },
];

export const mockMultiSigQueue = [
  {
    id: 1,
    action: "Freeze minting operation",
    requiredApprovals: 3,
    currentApprovals: 2,
    approvers: ["Admin1", "Admin2"],
    pending: ["Admin3"],
    priority: "high",
    createdDate: "2024-09-19",
  },
  {
    id: 2,
    action: "Pause smart contract",
    requiredApprovals: 4,
    currentApprovals: 1,
    approvers: ["Admin1"],
    pending: ["Admin2", "Admin3", "Admin4"],
    priority: "critical",
    createdDate: "2024-09-20",
  },
];

export const mockAuditLogs = [
  {
    id: 1,
    timestamp: "2024-09-20T14:30:00Z",
    user: "admin@universalcredit.com",
    action: "KYC_APPROVED",
    details: "Approved KYC for user alice@example.com",
    ipAddress: "192.168.1.100",
  },
  {
    id: 2,
    timestamp: "2024-09-20T13:15:00Z",
    user: "treasury@universalcredit.com",
    action: "RESERVE_UPDATE",
    details: "Updated BTC reserve proof document",
    ipAddress: "192.168.1.101",
  },
  {
    id: 3,
    timestamp: "2024-09-20T12:00:00Z",
    user: "compliance@universalcredit.com",
    action: "USER_SUSPENDED",
    details: "Suspended wallet for user carol@example.com",
    ipAddress: "192.168.1.102",
  },
];

export const mockTokenMetrics = {
  totalSupply: 1500000,
  circulating: 1250000,
  reserved: 250000,
  burnedTokens: 45000,
  priceUSD: 1.02,
  marketCap: 30150030000,
  volume24h: 355000,
};

export const mockCustodians = [
  {
    id: 1,
    name: "BitGo Institutional",
    type: "BTC",
    status: "active",
    totalHoldings: 1250.5,
    lastProofDate: "2024-09-18",
    contactEmail: "custody@bitgo.com",
  },
  {
    id: 2,
    name: "Perth Mint Gold",
    type: "Gold",
    status: "active",
    totalHoldings: 850.3,
    lastProofDate: "2024-09-19",
    contactEmail: "custody@perthmint.com",
  },
];

export const mockChartData = {
  supplyHistory: [
    { date: "2024-01", supply: 800000 },
    { date: "2024-02", supply: 950000 },
    { date: "2024-03", supply: 1100000 },
    { date: "2024-04", supply: 1200000 },
    { date: "2024-05", supply: 1350000 },
    { date: "2024-06", supply: 1400000 },
    { date: "2024-07", supply: 1450000 },
    { date: "2024-08", supply: 1500000 },
    { date: "2024-09", supply: 1500000 },
  ],
  reserveHistory: [
    { date: "2024-01", btc: 40, gold: 60 },
    { date: "2024-02", btc: 42, gold: 58 },
    { date: "2024-03", btc: 44, gold: 56 },
    { date: "2024-04", btc: 45, gold: 55 },
    { date: "2024-05", btc: 46, gold: 54 },
    { date: "2024-06", btc: 45, gold: 55 },
    { date: "2024-07", btc: 46, gold: 54 },
    { date: "2024-08", btc: 45, gold: 55 },
    { date: "2024-09", btc: 46, gold: 54 },
  ],
};

# 🌍 International Credit - Admin Platform

> A comprehensive admin dashboard for managing a global financial platform with blockchain integration, multi-signature governance, and compliance features.

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg)](https://vitejs.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2.9.0-764ABC.svg)](https://redux-toolkit.js.org/)
[![Wagmi](https://img.shields.io/badge/Wagmi-2.16.9-6366F1.svg)](https://wagmi.sh/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

International Credit Admin Platform is a modern, feature-rich admin dashboard designed for managing a global financial platform. It provides comprehensive tools for user management, KYC verification, custodian onboarding, transaction monitoring, governance, and compliance auditing. The platform integrates with blockchain networks for token management and multi-signature operations.

### Key Highlights

- 🔐 **Secure Authentication** - Two-factor authentication (2FA) with QR code setup
- 👥 **User & KYC Management** - Complete user lifecycle management with KYC approval/rejection workflow
- 🏦 **Custodian Onboarding** - Support for Gold (GBT) and Bitcoin (BBT) custodians with document verification
- 💰 **Reserve Management** - Real-time reserve composition tracking with blockchain data
- 📊 **Transaction Management** - Comprehensive transaction monitoring with filtering and export capabilities
- 🗳️ **Governance** - Proposal creation, voting, and tracking with blockchain integration
- 🔒 **Multi-Signature Queue** - Contract pause/unpause and minting freeze operations
- 📝 **Compliance & Audit** - Complete audit trail with filtering and search capabilities
- 🌐 **Blockchain Integration** - Wagmi integration for wallet connection and contract interactions

## ✨ Features

### Core Features

- **Dashboard**
  - Real-time token supply and value tracking
  - Market cap and trading volume metrics
  - Reserve composition visualization
  - Recent activity feed

- **User & KYC Management**
  - User search with debounced input
  - KYC status tracking (Verified, Pending, Unverified, Failed)
  - Document viewing and download
  - Whitelist/Blacklist functionality with reason tracking
  - Email verification status

- **Custodian Onboarding**
  - Support for multiple asset types (Gold/GBT, Bitcoin/BBT)
  - Document upload with S3 integration
  - Asset-specific validation
  - Status management (Active, Pending, Suspended)

- **Transaction Management**
  - Advanced filtering (type, status, currency, date range, user search)
  - Real-time transaction statistics
  - Transaction details modal
  - Export functionality
  - API-based pagination

- **Governance**
  - Proposal creation and management
  - Voting interface
  - Proposal status tracking
  - Expiration date management

- **Multi-Signature Queue**
  - Emergency contract pause/unpause
  - Minting freeze/unfreeze operations
  - Multi-sig approval workflow
  - Wallet connection required

- **Compliance & Audit**
  - Complete audit log with filtering
  - Action-based filtering
  - Date range filtering
  - Statistics dashboard
  - Pagination support

- **Settings**
  - Two-factor authentication setup
  - Theme switching (Light/Dark mode)
  - Email and push notification preferences
  - FCM token registration

## 🛠️ Tech Stack

### Languages & Runtime
- **JavaScript (ES6+)** - Primary programming language
- **Node.js** >= 18.x - Runtime environment
- **JSX** - React component syntax

### Frontend Framework & Libraries
- **React 18.2.0** - UI library with hooks
- **Vite 5.0.0** - Build tool and dev server (fast HMR)
- **React Router DOM 7.5.1** - Client-side routing
- **React Hook Form 7.56.2** - Form state management
- **React Redux 9.2.0** - React bindings for Redux

### State Management
- **Redux Toolkit 2.9.0** - State management library
- **RTK Query** - Data fetching and caching layer
- **@tanstack/react-query 5.90.2** - Server state management

### Blockchain Integration
- **Wagmi 2.16.9** - React Hooks for Ethereum
- **Viem 2.37.8** - TypeScript interface for Ethereum
- **@wagmi/core 2.20.3** - Core Wagmi functionality
- **@wagmi/connectors 5.9.9** - Wallet connectors (MetaMask, etc.)
- **Hedera Testnet** - Blockchain network

### UI Components & Styling
- **Radix UI** - Accessible, unstyled component primitives
  - Dialog, Dropdown, Select, Table, Toast, and more
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **tailwindcss-animate** - Animation utilities
- **Lucide React 0.507.0** - Icon library (500+ icons)
- **Sonner 2.0.3** - Toast notification system
- **shadcn/ui** - Re-usable component library

### Form Management & Validation
- **React Hook Form 7.56.2** - Performant form library
- **Zod 3.24.4** - TypeScript-first schema validation
- **@hookform/resolvers 5.0.1** - Validation resolvers

### APIs & Services
- **REST API** - Backend API for all CRUD operations
  - Authentication & Authorization
  - User Management
  - KYC Operations
  - Transaction Management
  - Governance Proposals
  - Audit Logs
- **Firebase Cloud Messaging (FCM)** - Push notifications
- **AWS S3** - Document storage (via backend API)
- **Smart Contract APIs** - Blockchain contract interactions

### Utilities & Helpers
- **date-fns 3.6.0** - Date manipulation and formatting
- **lodash 4.17.21** - Utility functions (debounce, etc.)
- **axios 1.8.4** - HTTP client
- **clsx 2.1.1** - Conditional class names
- **tailwind-merge 3.2.0** - Merge Tailwind classes
- **country-list 2.4.1** - Country data
- **world-countries 5.1.0** - World countries data

### Development Tools
- **Vite 5.0.0** - Build tool and dev server
- **ESLint 9.23.0** - Code linting
- **PostCSS 8.4.49** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing
- **Vitest 1.0.0** - Unit testing framework

### Additional Libraries
- **@tanstack/react-table 8.21.3** - Table component library
- **react-day-picker 8.10.1** - Date picker component
- **input-otp 1.4.2** - OTP input component
- **next-themes 0.4.6** - Theme management
- **vaul 1.1.2** - Drawer component
- **cmdk 1.1.1** - Command menu component

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/International-credit-admin-fe.git
   cd International-credit-admin-fe
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # API Configuration
   VITE_API_URL=https://dev-be.internationalcredit.io/api/v1
   
   # Blockchain Configuration
   VITE_IC_TOKEN_ADDRESS=0x...
   VITE_IC_CONTROLLER_ADDRESS=0x...
   VITE_ICBTC_TOKEN_ADDRESS=0x...
   VITE_ICAUT_TOKEN_ADDRESS=0x...
   VITE_MOCK_ORACLE_ADDRESS=0x...
   
   # Multi-Signature Configuration
   VITE_PAUSE_SMART_CONTRACT_NOUNS=...
   VITE_PAUSE_SMART_CONTRACT_SIGNER_ONE=0x...
   VITE_PAUSE_SMART_CONTRACT_SIGNER_TWO=0x...
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) (or the port shown in terminal)

## 📁 Project Structure

```
src/
├── assets/              # Images and static assets
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   ├── Dashboard/       # Dashboard-specific components
│   ├── Table/           # Data table components
│   ├── TransactionManagement/  # Transaction components
│   ├── ReserveManagement/     # Reserve components
│   ├── MultiSigQueueManagement/ # Multi-sig components
│   ├── Governance/      # Governance components
│   ├── custodian/       # Custodian components
│   └── Settings/        # Settings components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── store/               # Redux store configuration
│   ├── api/            # RTK Query API slices
│   └── slices/         # Redux slices
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   └── Abi/            # Smart contract ABIs
├── App.js               # Main App component
├── App.css              # App styles
├── index.js             # Entry point
└── index.css            # Global styles
```

## 🔑 Key Features

### Authentication & Security

- **Two-Factor Authentication (2FA)**
  - QR code generation for authenticator apps
  - Backup codes generation
  - Secure enable/disable with password verification

- **Role-Based Access Control**
  - Super Admin - Full access
  - Compliance Officer - User & KYC, Compliance & Audit
  - Treasury Manager - Reserves, Custodians, Multi-Sig

### User Management

- **Debounced Search** - Optimized search with 500ms debounce to reduce API calls
- **KYC Workflow** - Complete approval/rejection workflow with reason tracking
- **Document Management** - View and download user KYC documents
- **Status Tracking** - Real-time status updates with badges

### Custodian Management

- **Multi-Asset Support**
  - Gold (GBT) - Vault details, audit dates, verification documents
  - Bitcoin (BBT) - Wallet addresses, platform details, reserve verification

- **File Upload** - S3 integration for secure document storage
- **Dynamic Validation** - Asset-specific form validation

### Blockchain Integration

- **Token Management**
  - Real-time token supply tracking
  - Token value calculation
  - Reserve composition from blockchain data

- **Contract Operations**
  - Emergency pause/unpause
  - Minting freeze/unfreeze
  - Multi-signature approval workflow

### Governance

- **Proposal Management**
  - Create and track proposals
  - Voting interface
  - Expiration tracking
  - Status badges

### Compliance & Audit

- **Comprehensive Audit Trail**
  - User actions tracking
  - Resource changes
  - IP address logging
  - Timestamp tracking

- **Advanced Filtering**
  - Action-based filtering
  - Date range selection
  - Search functionality
  - Pagination

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API base URL | Yes |
| `VITE_IC_TOKEN_ADDRESS` | IC Token contract address | Yes |
| `VITE_IC_CONTROLLER_ADDRESS` | IC Controller contract address | Yes |
| `VITE_ICBTC_TOKEN_ADDRESS` | ICBTC Token contract address | Yes |
| `VITE_ICAUT_TOKEN_ADDRESS` | ICAUT Token contract address | Yes |
| `VITE_MOCK_ORACLE_ADDRESS` | Oracle contract address for prices | Yes |
| `VITE_PAUSE_SMART_CONTRACT_NOUNS` | Multi-sig nouns for contract operations | Yes |
| `VITE_PAUSE_SMART_CONTRACT_SIGNER_ONE` | First multi-sig signer address | Yes |
| `VITE_PAUSE_SMART_CONTRACT_SIGNER_TWO` | Second multi-sig signer address | Yes |

## 📜 Available Scripts

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture Overview

### System Architecture

The application follows a **component-based architecture** with **centralized state management** and **API integration**:

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │   Protected  │  │   Public     │      │
│  │              │  │    Routes    │  │   Routes     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  State Management Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Redux Store  │  │  RTK Query   │  │   React      │      │
│  │   (Slices)   │  │  (API Cache) │  │   Context    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│      REST API Layer      │  │   Blockchain Layer       │
│  ┌────────────────────┐ │  │  ┌────────────────────┐ │
│  │  Backend API       │ │  │  │  Wagmi/Viem        │ │
│  │  - Authentication  │ │  │  │  - Contract Reads  │ │
│  │  - User Management │ │  │  │  - Contract Writes │ │
│  │  - Transactions    │ │  │  │  - Wallet Connect  │ │
│  │  - Governance      │ │  │  │  - Multi-Sig Ops   │ │
│  │  - Audit Logs     │ │  │  └────────────────────┘ │
│  └────────────────────┘ │  └──────────────────────────┘
└──────────────────────────┘
                │
                ▼
┌──────────────────────────┐
│   External Services      │
│  - Firebase FCM         │
│  - AWS S3 Storage       │
│  - Smart Contracts     │
└──────────────────────────┘
```

### Data Flow Architecture

#### 1. Authentication Flow
```
User Login
    │
    ├─→ Credentials → API → JWT Token
    │
    ├─→ 2FA Required? → Yes → MFA Step
    │                    │
    │                    └─→ Verify Code → Complete Login
    │
    └─→ No 2FA → Direct Login → Redux Store → Protected Routes
```

#### 2. Data Fetching Flow
```
Component Mount
    │
    ├─→ RTK Query Hook (useQuery)
    │
    ├─→ Check Cache → Hit? → Return Cached Data
    │
    └─→ Miss? → API Request → Transform Response → Update Cache → Component Re-render
```

#### 3. Mutation Flow
```
User Action (e.g., Approve KYC)
    │
    ├─→ RTK Query Mutation (useMutation)
    │
    ├─→ API Request → Success → Invalidate Tags → Refetch Related Queries
    │
    └─→ Error → Error Handler → Toast Notification
```

#### 4. Blockchain Interaction Flow
```
User Action (e.g., Pause Contract)
    │
    ├─→ Wallet Connection Check
    │
    ├─→ Connected? → No → Request Connection
    │
    └─→ Yes → Wagmi Hook (useWriteContract)
            │
            ├─→ Sign Transaction → Submit to Network
            │
            └─→ Success/Error → Update UI → Toast Notification
```

### State Management Architecture

#### Redux Store Structure
```
store/
├── api/
│   ├── apiSlice.js              # Base API configuration
│   ├── userManagementApiSlice.js # User & KYC operations
│   ├── custodianApiSlice.js     # Custodian management
│   ├── transactionApiSlice.js   # Transaction operations
│   ├── governanceApiSlice.js    # Governance proposals
│   ├── auditApiSlice.js         # Audit logs
│   ├── dashboardApiSlice.js    # Dashboard statistics
│   └── userProfileApi.js        # User profile operations
│
└── slices/
    ├── authSlice.js             # Authentication state
    ├── userSlice.js             # User filters & pagination
    └── walletSlice.js           # Wallet connection state
```

#### Component Architecture

```
components/
├── ui/                          # Reusable UI primitives (shadcn/ui)
│   ├── button.jsx
│   ├── card.jsx
│   ├── dialog.jsx
│   └── ...
│
├── Layout/                       # Layout components
│   └── Layout.jsx               # Main layout wrapper
│
├── Dashboard/                    # Dashboard feature
│   ├── Stats.jsx                # Token statistics
│   └── ReserveComponsation.jsx  # Reserve composition
│
├── Table/                        # Data tables
│   ├── UserDataTable.jsx
│   ├── CustodianDataTable.jsx
│   └── ...
│
└── [Feature]/                    # Feature-specific components
    ├── [Feature].jsx            # Main feature component
    └── [SubComponents]/         # Feature sub-components
```

### API Integration Architecture

#### API Slice Organization
- **Base Query** - Centralized error handling and authentication
- **Tag-based Cache** - Automatic cache invalidation
- **Optimistic Updates** - Immediate UI updates before API confirmation
- **Error Handling** - Centralized error handling with toast notifications

#### API Endpoints Structure
```
/api/v1/
├── /auth/                       # Authentication
│   ├── POST /login              # Login with credentials
│   ├── POST /login/2fa          # 2FA verification
│   └── GET /me                  # Get current user
│
├── /users/                       # User management
│   ├── GET /users               # List users with filters
│   ├── GET /users/:id           # Get user details
│   ├── POST /users/:id/approve  # Approve KYC
│   └── POST /users/:id/reject   # Reject KYC
│
├── /custodians/                  # Custodian management
│   ├── GET /custodians          # List custodians
│   ├── POST /custodians         # Create custodian
│   └── POST /custodians/:id/approve
│
├── /transactions/                 # Transaction management
│   ├── GET /transactions         # List transactions
│   └── GET /transactions/stats  # Transaction statistics
│
├── /governance/                  # Governance
│   ├── GET /proposals           # List proposals
│   ├── POST /proposals          # Create proposal
│   └── POST /proposals/:id/vote # Vote on proposal
│
└── /audit/                       # Audit logs
    ├── GET /logs                # Get audit logs
    └── GET /stats               # Audit statistics
```

### Blockchain Integration Architecture

#### Smart Contract Interactions
- **Read Operations** (via `useReadContract`)
  - Token supply
  - Token value
  - Reserve balances
  - Contract state (paused, minting frozen)

- **Write Operations** (via `useWriteContract`)
  - Emergency pause/unpause
  - Minting freeze/unfreeze
  - Governance voting (future)

#### Wallet Integration
- **Wallet Providers** - MetaMask, WalletConnect, etc.
- **Connection Management** - Automatic reconnection
- **Transaction Signing** - User approval required
- **Multi-Signature** - Multiple signer approval workflow

### Security Architecture

#### Authentication Flow
1. **Login** → Credentials → JWT Token
2. **2FA Check** → If enabled → MFA verification
3. **Token Storage** → Redux store (in-memory)
4. **API Requests** → Bearer token in headers
5. **Token Refresh** → Automatic refresh on expiry
6. **Logout** → Clear token and redirect

#### Authorization
- **Role-Based Access Control (RBAC)**
  - Super Admin - Full access
  - Compliance Officer - Limited access
  - Treasury Manager - Financial operations only

- **Route Protection** - ProtectedRoute component
- **Component-Level** - Conditional rendering based on role

### Performance Optimizations

- **Code Splitting** - Route-based code splitting
- **Lazy Loading** - Component lazy loading
- **Debouncing** - Search input debouncing (500ms)
- **Caching** - RTK Query automatic caching
- **Memoization** - React.memo and useMemo for expensive operations
- **Virtual Scrolling** - Large data tables (future enhancement)

## 🎨 UI/UX Features

- **Dark Mode** - Full dark mode support with theme persistence
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Loading States** - Skeleton loaders and loading indicators
- **Error Handling** - Comprehensive error messages and toast notifications
- **Accessibility** - Radix UI components for accessibility compliance

## 🔐 Security Features

- **JWT Authentication** - Token-based authentication
- **2FA Support** - Two-factor authentication with TOTP
- **Role-Based Access** - Different access levels for different roles
- **Secure File Upload** - S3 integration for document storage
- **Audit Logging** - Complete audit trail for compliance

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.



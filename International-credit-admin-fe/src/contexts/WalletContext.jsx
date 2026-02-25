import React, { createContext, useContext } from "react";

import { useWallet } from "../hooks/useWallet";

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const walletState = useWallet();

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export default WalletContext;

import React, { createContext, useContext, useState, useCallback } from "react";

const NetworkContext = createContext({
  isOnline: true,
  reportOnline: () => {},
  reportOffline: () => {},
});

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const reportOnline = useCallback(() => setIsOnline(true), []);
  const reportOffline = useCallback(() => setIsOnline(false), []);
  return (
    <NetworkContext.Provider value={{ isOnline, reportOnline, reportOffline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);

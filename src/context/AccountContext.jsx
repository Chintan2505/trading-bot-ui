import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAccountInfo } from '@/services/api';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const failCount = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await getAccountInfo();
      if (data.success) {
        setAccount(data.account);
        failCount.current = 0;
      }
    } catch (err) {
      failCount.current += 1;
      // Only log first failure, not every 30s
      if (failCount.current === 1) {
        console.error('[AccountContext] Failed to fetch account:', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      // Back off if repeated failures (don't spam a down server)
      if (failCount.current < 5) {
        refresh();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AccountContext.Provider value={{ account, isLoading, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used within AccountProvider');
  return context;
}

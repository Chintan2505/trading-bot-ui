import React, { useState, useEffect } from 'react';
import { useAccount } from '@/context/AccountContext';
import { getAccountConfig } from '@/services/api';
import AccountView from '../view/account.view';

export default function AccountContainer() {
  const { account, isLoading, refresh } = useAccount();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getAccountConfig().then(data => {
      if (data.success) setConfig(data.config);
    }).catch(() => {});
  }, []);

  return (
    <AccountView
      account={account}
      isLoading={isLoading}
      refresh={refresh}
      config={config}
    />
  );
}

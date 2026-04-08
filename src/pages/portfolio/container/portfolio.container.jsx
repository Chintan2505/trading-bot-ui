import React, { useState, useEffect, useCallback } from 'react';
import { getPositions, closePosition, closeAllPositions } from '@/services/api';
import { toast } from 'sonner';
import PortfolioView from '../view/portfolio.view';

export default function PortfolioContainer() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closingSymbol, setClosingSymbol] = useState(null);
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPositions();
      if (data.success) setPositions(data.positions);
    } catch (err) {
      toast.error('Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const handleClose = async (symbol) => {
    setClosingSymbol(symbol);
    try {
      const data = await closePosition(symbol);
      if (data.success) {
        toast.success(`Closed position: ${symbol}`);
        fetchPositions();
      }
    } catch (err) {
      toast.error(`Failed to close ${symbol}`);
    } finally {
      setClosingSymbol(null);
    }
  };

  const handleCloseAll = async () => {
    setShowCloseAllConfirm(false);
    try {
      const data = await closeAllPositions();
      if (data.success) {
        toast.success('All positions closed');
        fetchPositions();
      }
    } catch (err) {
      toast.error('Failed to close all positions');
    }
  };

  const totalPL = positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pl || 0), 0);
  const totalValue = positions.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0);

  return (
    <PortfolioView
      positions={positions}
      loading={loading}
      closingSymbol={closingSymbol}
      showCloseAllConfirm={showCloseAllConfirm}
      setShowCloseAllConfirm={setShowCloseAllConfirm}
      fetchPositions={fetchPositions}
      handleClose={handleClose}
      handleCloseAll={handleCloseAll}
      totalPL={totalPL}
      totalValue={totalValue}
    />
  );
}

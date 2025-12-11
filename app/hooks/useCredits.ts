import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

export function useCredits(initialCredits: number, maxCredits: number) {
  const [credits, setCredits] = useState(initialCredits);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (credits <= 15 && credits > 0) {
      setShowWarning(true);
    } else if (credits === 0) {
      // Redirect to pricing if no credits
      setTimeout(() => navigate('/app/upgrade'), 2000);
    }
  }, [credits, navigate]);
  
  const useCredits = (amount: number): boolean => {
    if (credits >= amount) {
      setCredits(prev => prev - amount);
      return true;
    }
    return false;
  };
  
  const canAfford = (cost: number): boolean => {
    return credits >= cost;
  };
  
  const percentageRemaining = (): number => {
    return (credits / maxCredits) * 100;
  };
  
  return {
    credits,
    showWarning,
    useCredits,
    canAfford,
    percentageRemaining,
    setCredits
  };
}

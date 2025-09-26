import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

interface InsuranceOption {
  type: 'basic' | 'premium' | 'elite';
  premium: number;
  premiumRate: number;
  coverageRate: number;
  coverageAmount: number;
  totalCost: number;
  valueForMoney: number;
}

const InsuranceInterface: React.FC = () => {
  const { user, token } = useAuthStore();
  const { currentBet, setInsuranceOptions, setSelectedInsurance } = useGameStore();
  const [insuranceOptions, setLocalInsuranceOptions] = useState<InsuranceOption[]>([]);
  const [selectedInsurance, setLocalSelectedInsurance] = useState<'basic' | 'premium' | 'elite' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsuranceOptions = useCallback(async () => {
    if (currentBet <= 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/insurance/options?betAmount=${currentBet}`);
      if (!response.ok) {
        throw new Error('Failed to fetch insurance options');
      }
      
      const options = await response.json();
      setLocalInsuranceOptions(options);
      setInsuranceOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insurance options');
    } finally {
      setLoading(false);
    }
  }, [currentBet, setInsuranceOptions]);

  useEffect(() => {
    if (currentBet > 0) {
      fetchInsuranceOptions();
    }
  }, [currentBet, fetchInsuranceOptions]);

  const handleInsuranceSelect = (type: 'basic' | 'premium' | 'elite') => {
    setLocalSelectedInsurance(type);
    setSelectedInsurance(type);
  };

  const handlePurchaseInsurance = async () => {
    if (!selectedInsurance || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/insurance/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          betId: Date.now(), // This should be the actual bet ID
          insuranceType: selectedInsurance,
          betAmount: currentBet,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to purchase insurance');
      }
      
      const result = await response.json();
      console.log('Insurance purchased:', result);
      
      // Reset selection
      setLocalSelectedInsurance(null);
      setSelectedInsurance(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase insurance');
    } finally {
      setLoading(false);
    }
  };

  if (currentBet <= 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400">Place a bet to see insurance options</p>
      </div>
    );
  }

  if (loading && insuranceOptions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading insurance options...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Bet Insurance</h3>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {insuranceOptions.map((option) => (
          <div
            key={option.type}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedInsurance === option.type
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => handleInsuranceSelect(option.type)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium capitalize">{option.type}</span>
              <span className="text-green-400 font-bold">{option.coverageRate * 100}% Coverage</span>
            </div>
            
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Premium:</span>
                <span className="text-yellow-400">{option.premium} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage Amount:</span>
                <span className="text-green-400">{option.coverageAmount} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="text-blue-400">{option.totalCost} FCFA</span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-400">
              Value: {option.valueForMoney.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      {selectedInsurance && (
        <button
          onClick={handlePurchaseInsurance}
          disabled={loading}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Purchasing...' : `Purchase ${selectedInsurance} Insurance`}
        </button>
      )}
      
      <div className="mt-4 text-xs text-gray-400">
        <p>• Insurance protects your bet if the tower crashes</p>
        <p>• Premium is deducted immediately upon purchase</p>
        <p>• Coverage is automatically applied if you lose</p>
      </div>
    </div>
  );
};

export default InsuranceInterface;

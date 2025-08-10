import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, Wallet, ArrowLeft, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { formatXAF } from '../../utils/currency';
import api from '../../services/api';

interface PaymentFormData {
  amount: number;
  paymentMethod: string;
  cardToken?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  walletAddress?: string;
}

const RechargePage: React.FC = () => {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 0,
    paymentMethod: 'mtn_mobile_money'
  });
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [params] = useSearchParams();
  const { user, updateBalance, token } = useAuthStore();

  const quickAmounts = [1000, 2500, 5000, 10000, 25000, 50000]; // FCFA

  useEffect(() => {
    const preset = params.get('amount');
    if (preset && !formData.amount) {
      setFormData(prev => ({ ...prev, amount: parseInt(preset) }));
    }
  }, [params, formData.amount]);

  const validateForm = (): boolean => {
    if (!formData.amount || formData.amount < 1000) {
      setMessage({ type: 'error', text: 'Minimum recharge amount is 1,000 FCFA' });
      return false;
    }

    switch (formData.paymentMethod) {
      case 'mtn_mobile_money':
      case 'orange_money':
        if (!phone || phone.length < 8) {
          setMessage({ type: 'error', text: 'Please enter a valid phone number' });
          return false;
        }
        break;
      case 'credit_card':
      case 'debit_card':
        if (!cardNumber || !expiryDate || !cvv) {
          setMessage({ type: 'error', text: 'Please fill in all card details' });
          return false;
        }
        break;
      case 'bank_transfer':
        if (!accountNumber || !bankCode) {
          setMessage({ type: 'error', text: 'Please enter account number and bank code' });
          return false;
        }
        break;
      case 'digital_wallet':
        if (!walletAddress) {
          setMessage({ type: 'error', text: 'Please enter wallet address' });
          return false;
        }
        break;
    }
    return true;
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      // Prepare payment data
      const paymentData: any = {
        amount: formData.amount,
        paymentMethod: formData.paymentMethod
      };

      // Add method-specific data
      switch (formData.paymentMethod) {
        case 'mtn_mobile_money':
        case 'orange_money':
          paymentData.phoneNumber = phone;
          break;
        case 'credit_card':
        case 'debit_card':
          // For Stripe, we'd need to create a payment method first
          // For now, we'll simulate with a token
          paymentData.cardToken = 'tok_visa'; // This would come from Stripe Elements
          break;
        case 'bank_transfer':
          paymentData.accountNumber = accountNumber;
          paymentData.bankCode = bankCode;
          break;
        case 'digital_wallet':
          paymentData.walletAddress = walletAddress;
          break;
      }

      // Make API call to backend
      const response = await api.post('/payment/recharge', paymentData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Recharge initiated successfully! Transaction ID: ${response.data.transaction.id}` 
        });
        
        // Update local balance if payment is completed immediately
        if (response.data.transaction.status === 'completed') {
          updateBalance(((user?.balance as number) || 0) + formData.amount);
        }
        
        // Reset form
        setFormData({ amount: 0, paymentMethod: 'mtn_mobile_money' });
        setPhone('');
        setCardNumber('');
        setExpiryDate('');
        setCvv('');
        setAccountNumber('');
        setBankCode('');
        setWalletAddress('');
      }
    } catch (error: any) {
      console.error('Recharge error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Recharge failed. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numeric = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, amount: numeric }));
  };

  const handlePaymentMethodChange = (method: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg border border-gray-700 p-8"
        >
          {/* Header */}
          <div className="flex items-center mb-6">
            <Link to="/auth" className="mr-4">
              <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Recharge Account</h1>
              <p className="text-gray-400">Add funds to your account (FCFA)</p>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' 
                ? 'bg-green-900 border border-green-700 text-green-200' 
                : 'bg-red-900 border border-red-700 text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleRecharge} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (FCFA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  min="1000"
                  className="w-full px-3 py-2 pl-10 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quick Amounts
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => handleAmountChange(quickAmount.toString())}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    {formatXAF(quickAmount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mtn_mobile_money"
                    checked={formData.paymentMethod === 'mtn_mobile_money'}
                    onChange={() => handlePaymentMethodChange('mtn_mobile_money')}
                    className="text-blue-600"
                  />
                  <Phone className="w-5 h-5" />
                  <span>MTN Mobile Money</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="orange_money"
                    checked={formData.paymentMethod === 'orange_money'}
                    onChange={() => handlePaymentMethodChange('orange_money')}
                    className="text-blue-600"
                  />
                  <Phone className="w-5 h-5" />
                  <span>Orange Money</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={formData.paymentMethod === 'credit_card'}
                    onChange={() => handlePaymentMethodChange('credit_card')}
                    className="text-blue-600"
                  />
                  <CreditCard className="w-5 h-5" />
                  <span>Credit Card</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit_card"
                    checked={formData.paymentMethod === 'debit_card'}
                    onChange={() => handlePaymentMethodChange('debit_card')}
                    className="text-blue-600"
                  />
                  <CreditCard className="w-5 h-5" />
                  <span>Debit Card</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={formData.paymentMethod === 'bank_transfer'}
                    onChange={() => handlePaymentMethodChange('bank_transfer')}
                    className="text-blue-600"
                  />
                  <CreditCard className="w-5 h-5" />
                  <span>Bank Transfer</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="digital_wallet"
                    checked={formData.paymentMethod === 'digital_wallet'}
                    onChange={() => handlePaymentMethodChange('digital_wallet')}
                    className="text-blue-600"
                  />
                  <Wallet className="w-5 h-5" />
                  <span>Digital Wallet</span>
                </label>
              </div>
            </div>

            {/* Payment Details */}
            {(formData.paymentMethod === 'mtn_mobile_money' || formData.paymentMethod === 'orange_money') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 677123456"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  You will receive a prompt on your phone to confirm the payment.
                </p>
              </div>
            )}

            {(formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Your payment will be processed securely through Stripe.
                </p>
              </div>
            )}

            {formData.paymentMethod === 'bank_transfer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter your bank account number"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bank Code
                  </label>
                  <input
                    type="text"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    placeholder="Enter your bank code"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {formData.paymentMethod === 'digital_wallet' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your wallet address"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.amount || formData.amount < 1000}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Processing...' : `Recharge ${formatXAF(formData.amount)}`}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> Minimum recharge amount is {formatXAF(1000)}.
            </p>
            <p className="text-sm text-blue-200 mt-2">
              <strong>Security:</strong> All payments are processed through secure payment gateways.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RechargePage;

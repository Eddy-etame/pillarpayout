import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const VerificationPage: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;

    setLoading(true);
    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerified(true);
    } catch (error) {
      alert('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      // Simulate resend
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Verification code sent to your email!');
    } catch (error) {
      alert('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
            <p className="text-gray-400 mb-6">
              Your email has been successfully verified. You can now access all features.
            </p>
            <Link
              to="/game"
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
            >
              Start Playing
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">Email Verification</h1>
              <p className="text-gray-400">Verify your email address</p>
            </div>
          </div>

          {/* Icon */}
          <div className="text-center mb-6">
            <Mail className="w-16 h-16 text-blue-400 mx-auto" />
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-200">
              We've sent a verification code to your email address. 
              Please enter the code below to verify your account.
            </p>
          </div>

          <form onSubmit={handleVerification} className="space-y-6">
            {/* Verification Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !verificationCode}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendCode}
              disabled={loading}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium disabled:text-gray-600"
            >
              {loading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Note:</strong> The verification code expires in 10 minutes. 
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerificationPage;

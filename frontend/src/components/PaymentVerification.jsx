import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';

const PaymentVerification = () => {
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyPayment = async () => {
      const queryParams = new URLSearchParams(location.search);
      const tx_ref = queryParams.get('tx_ref');

      if (!tx_ref) {
        setVerificationStatus('failed');
        setError('No transaction reference found');
        return;
      }

      try {
        const isPaid = await paymentService.checkPaymentStatus(tx_ref);

        if (isPaid) {
          // Already verified — go straight to success page which will handle download
          navigate(`/payment/success?tx_ref=${tx_ref}`);
          return;
        }

        // Try calling the verify endpoint
        try {
          const result = await paymentService.verifyPayment(tx_ref);
          if (result?.status === 'success') {
            navigate(`/payment/success?tx_ref=${tx_ref}`);
            return;
          }
        } catch (_) { /* fall through to polling */ }

        // Payment may still be in-flight — poll
        setVerificationStatus('pending');

        const interval = setInterval(async () => {
          const paid = await paymentService.checkPaymentStatus(tx_ref);
          if (paid) {
            clearInterval(interval);
            navigate(`/payment/success?tx_ref=${tx_ref}`);
          }
        }, 3000);

        // Clear interval after 2 minutes
        setTimeout(() => clearInterval(interval), 120000);

      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('failed');
        setError('Failed to verify payment. Please go to your dashboard and try downloading the certificate.');
      }
    };

    verifyPayment();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {verificationStatus === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Verifying Payment
              </h2>
              <p className="mt-2 text-gray-600">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Payment Successful!
              </h2>
              <p className="mt-2 text-gray-600">
                Your payment has been verified. Thank you for your purchase.
              </p>
              {paymentInfo && (
                <div className="mt-4 text-left border-t pt-4">
                  <h3 className="font-medium text-gray-900">Payment Details:</h3>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Amount:</dt>
                      <dd className="text-gray-900">${paymentInfo.amount} ETB</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Transaction Ref:</dt>
                      <dd className="text-gray-900">{paymentInfo.transactionReference}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Paid At:</dt>
                      <dd className="text-gray-900">
                        {new Date(paymentInfo.paidAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500">
                Redirecting you in a few seconds...
              </p>
            </>
          )}

          {verificationStatus === 'pending' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Payment Pending
              </h2>
              <p className="mt-2 text-gray-600">
                We're still waiting for payment confirmation from Chapa.
                This page will automatically update when payment is received.
              </p>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => {
                    const queryParams = new URLSearchParams(location.search);
                    const tx_ref = queryParams.get('tx_ref');
                    navigate(`/payment/success?tx_ref=${tx_ref}`);
                  }}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ✅ I have paid, View Certificate
                </button>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  Checking status automatically...
                </div>
              </div>
            </>
          )}

          {verificationStatus === 'failed' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Payment Verification Failed
              </h2>
              <p className="mt-2 text-gray-600">
                {error || 'There was an issue verifying your payment.'}
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;
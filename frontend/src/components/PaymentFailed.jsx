import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';

const PaymentFailed = () => {
  const [errorDetails, setErrorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const queryParams = new URLSearchParams(location.search);
      const tx_ref = queryParams.get('tx_ref');

      if (tx_ref) {
        try {
          // Check if payment actually succeeded (in case of false redirect)
          const response = await paymentService.getPaymentStatus(tx_ref);
          if (response.status === 'success' && response.data?.status === 'paid') {
            // Payment actually succeeded, redirect to success page
            navigate(`/payment/success?tx_ref=${tx_ref}`);
            return;
          }
          setErrorDetails(response.data);
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
      setLoading(false);
    };

    checkPaymentStatus();
  }, [location, navigate]);

  const handleRetry = () => {
    const queryParams = new URLSearchParams(location.search);
    const tx_ref = queryParams.get('tx_ref');
    
    if (tx_ref?.includes('VE')) {
      navigate('/my-events');
    } else {
      navigate('/profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Checking Payment Status...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100">
            <svg
              className="h-12 w-12 text-red-600"
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
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Failed
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            We couldn't process your payment. Please try again or contact support if the problem persists.
          </p>

          {errorDetails && (
            <div className="mt-6 p-4 bg-red-50 rounded-md text-left">
              <h3 className="text-sm font-medium text-red-800">Error Details:</h3>
              <p className="mt-2 text-sm text-red-700">
                {errorDetails.message || 'Transaction could not be completed'}
              </p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="bg-yellow-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800">Common reasons for failure:</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li>Insufficient funds</li>
                <li>Network timeout</li>
                <li>Transaction cancelled by user</li>
                <li>Technical error with payment provider</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            If you were charged but didn't receive confirmation, please contact support with your transaction reference.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
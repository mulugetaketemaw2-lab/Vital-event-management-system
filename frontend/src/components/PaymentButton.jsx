import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import paymentService from '../services/paymentService';

const PaymentButton = ({ paymentType, eventId, onSuccess, className = '' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Initiating payment:', { paymentType, eventId });
      
      const result = await paymentService.initializePayment(paymentType, eventId);
      
      if (result.success) {
        console.log('Payment initialized, redirecting to:', result.checkout_url);
        // Redirect to Chapa checkout
        window.location.href = result.checkout_url;
        if (onSuccess) onSuccess(result);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(t('failed_initialize_payment', 'Failed to initialize payment. Please try again.'));
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return t('initializing', 'Initializing...');
    return t('pay_now');
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {getButtonText()}
          </>
        ) : (
          getButtonText()
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default PaymentButton;
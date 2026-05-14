import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PaymentService {
  // Initialize payment
 // services/paymentService.js
async initializePayment(paymentType, eventId = null) {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to make a payment'
            };
        }

        // Validate paymentType
        if (!paymentType || (paymentType !== 'resident_id' && paymentType !== 'vital_event')) {
            return {
                success: false,
                message: 'Invalid payment type'
            };
        }

        // For vital_event, eventId is required
        if (paymentType === 'vital_event' && !eventId) {
            return {
                success: false,
                message: 'Event ID is required for vital event payment'
            };
        }

        console.log('Initializing payment:', { paymentType, eventId });

        const response = await axios.post(
            `${API_URL}/payment/initialize`,
            { paymentType, eventId },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data && response.data.status === 'success') {
            // Ensure we have a valid checkout_url
            if (response.data.checkout_url) {
                return {
                    success: true,
                    checkout_url: response.data.checkout_url,
                    tx_ref: response.data.tx_ref || ''
                };
            } else {
                return {
                    success: false,
                    message: 'Invalid response from payment gateway'
                };
            }
        }
        
        // Handle error response
        const errorMessage = response.data?.message || 'Payment initialization failed';
        return {
            success: false,
            message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)
        };
        
    } catch (error) {
        console.error('Payment initialization error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // Handle specific error messages from backend
        if (error.response?.data?.message) {
            return {
                success: false,
                message: typeof error.response.data.message === 'string' 
                    ? error.response.data.message 
                    : 'Payment service error'
            };
        }
        
        return {
            success: false,
            message: 'Error connecting to payment service'
        };
    }
}

  // Get payment status
  async getPaymentStatus(tx_ref) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/payment/status/${tx_ref}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  // Check if payment is completed
  async checkPaymentStatus(tx_ref) {
    try {
      const result = await this.getPaymentStatus(tx_ref);
      return result.data?.status === 'paid';
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }

  // Get user info
  async getUserInfo() {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return null;
      }

      const response = await axios.get(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }
}

export default new PaymentService();
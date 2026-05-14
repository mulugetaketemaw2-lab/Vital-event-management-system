import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PaymentService {
  // Initialize payment
  async initializePayment(paymentType, eventId = null, paymentMethod = 'chapa') {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return {
          success: false,
          message: 'You must be logged in to make a payment'
        };
      }

      console.log('Initializing payment:', { paymentType, eventId });

      const response = await axios.post(
        `${API_URL}/payment/initialize`,
        { paymentType, eventId, paymentMethod },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Payment initialization response:', response.data);
      
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          checkout_url: response.data.checkout_url,
          tx_ref: response.data.tx_ref || ''
        };
      }
      
      return {
        success: false,
        message: response.data?.message || 'Payment initialization failed'
      };
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      
      // Handle specific error messages from backend
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message
        };
      }
      
      return {
        success: false,
        message: 'Error connecting to payment service'
      };
    }
  }

  // Verify payment
  async verifyPayment(tx_ref) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/payment/verify/${tx_ref}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Get payment status
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

  // Debug function to check event
  async checkEvent(eventId) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        return null;
      }

      const response = await axios.get(`${API_URL}/payment/debug/check-event/${eventId}`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking event:', error);
      return null;
    }
  }
}
console.log('✅ Payment service loaded');

// Create and export a single instance
const paymentService = new PaymentService();
export default paymentService;
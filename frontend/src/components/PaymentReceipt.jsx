// components/PaymentReceipt.jsx
import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const PaymentReceipt = ({ paymentInfo, userInfo }) => {
  const downloadReceipt = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Payment Receipt', 105, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add payment details
    doc.autoTable({
      startY: 40,
      head: [['Field', 'Value']],
      body: [
        ['Transaction Reference', paymentInfo.transactionReference || 'N/A'],
        ['Amount', paymentInfo.amount ? `${paymentInfo.amount} ETB` : 'N/A'],
        ['Status', paymentInfo.status || 'N/A'],
        ['Payment Date', paymentInfo.paidAt ? new Date(paymentInfo.paidAt).toLocaleString() : 'N/A'],
        ['Payer Name', userInfo?.personalInfo ? `${userInfo.personalInfo.firstName || ''} ${userInfo.personalInfo.lastName || ''}`.trim() || 'N/A' : 'N/A'],
        ['Email', userInfo?.email || 'N/A'],
      ],
    });
    
    // Save PDF
    doc.save(`receipt-${paymentInfo.transactionReference || 'unknown'}.pdf`);
  };

  return (
    <button
      onClick={downloadReceipt}
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg
        className="h-4 w-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Download Receipt
    </button>
  );
};

export default PaymentReceipt;
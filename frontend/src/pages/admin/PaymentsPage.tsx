import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
              <p className="text-sm text-gray-600">Record and manage tenant payments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Management</h2>
          <p className="text-gray-600 mb-6">
            This page will contain payment management functionality including:
          </p>
          <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
            <li>• Record new payments from tenants</li>
            <li>• Allocate payments to specific dues</li>
            <li>• View payment history and reports</li>
            <li>• Handle partial payments</li>
            <li>• Generate payment receipts</li>
            <li>• Track outstanding balances</li>
          </ul>
          <Button
            onClick={() => navigate('/')}
            className="mt-6"
            variant="secondary"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentsPage;

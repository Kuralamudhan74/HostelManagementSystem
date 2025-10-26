import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

const ExpensesPage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-sm text-gray-600">Track and manage hostel expenses</p>
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
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Expense Management</h2>
          <p className="text-gray-600 mb-6">
            This page will contain expense management functionality including:
          </p>
          <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
            <li>• Record new expenses</li>
            <li>• Categorize expenses by type</li>
            <li>• Upload expense receipts</li>
            <li>• View expense reports and analytics</li>
            <li>• Track monthly expense trends</li>
            <li>• Export expense data</li>
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

export default ExpensesPage;

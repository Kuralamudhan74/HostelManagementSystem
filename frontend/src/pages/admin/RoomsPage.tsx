import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

const RoomsPage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
              <p className="text-sm text-gray-600">Manage hostel rooms and occupancy</p>
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
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Management</h2>
          <p className="text-gray-600 mb-6">
            This page will contain room management functionality including:
          </p>
          <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
            <li>• View all rooms with current occupancy</li>
            <li>• Add new rooms to hostels</li>
            <li>• Edit room details and rent amounts</li>
            <li>• Assign tenants to rooms</li>
            <li>• View room inventory and condition</li>
            <li>• Track room maintenance</li>
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

export default RoomsPage;

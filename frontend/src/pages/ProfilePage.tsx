import React from 'react';
import { motion } from 'framer-motion';
import { User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const ProfilePage: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-600">Manage your account information</p>
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
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Management</h2>
          <p className="text-gray-600 mb-6">
            This page will contain profile management functionality including:
          </p>
          <ul className="text-left max-w-md mx-auto text-gray-600 space-y-2">
            <li>• Update personal information</li>
            <li>• Change password</li>
            <li>• Upload profile picture</li>
            <li>• View account activity</li>
            <li>• Manage notification preferences</li>
            <li>• Account security settings</li>
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

export default ProfilePage;

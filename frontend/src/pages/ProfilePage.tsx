import React, { useState } from 'react';
import { ArrowLeft, Save, Receipt, Lock, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiClient from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils';
import Modal from '../components/Modal';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    dateOfBirth: '',
    phone: '',
    whatsappNumber: '',
    permanentAddress: '',
    city: '',
    state: '',
    aadharNumber: '',
    occupation: '',
    collegeCompanyName: '',
    officeAddress: '',
    expectedDurationStay: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    secretCode: '',
    newPassword: '',
    confirmPassword: '',
    useSecretCode: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch user profile
  const { isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await apiClient.getProfile();
      setFormData({
        firstName: data.user?.firstName || '',
        lastName: data.user?.lastName || '',
        fatherName: data.user?.fatherName || '',
        dateOfBirth: data.user?.dateOfBirth || '',
        phone: data.user?.phone || '',
        whatsappNumber: data.user?.whatsappNumber || '',
        permanentAddress: data.user?.permanentAddress || '',
        city: data.user?.city || '',
        state: data.user?.state || '',
        aadharNumber: data.user?.aadharNumber || '',
        occupation: data.user?.occupation || '',
        collegeCompanyName: data.user?.collegeCompanyName || '',
        officeAddress: data.user?.officeAddress || '',
        expectedDurationStay: data.user?.expectedDurationStay || '',
        emergencyContactName: data.user?.emergencyContactName || '',
        emergencyContactNumber: data.user?.emergencyContactNumber || '',
        emergencyContactRelation: data.user?.emergencyContactRelation || '',
      });
      return data;
    },
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await apiClient.updateProfile(formData);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!passwordForm.useSecretCode && !passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (passwordForm.useSecretCode && !passwordForm.secretCode) {
      toast.error('Please enter the secret code');
      return;
    }

    setIsChangingPassword(true);

    try {
      const data: any = {
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      };

      if (passwordForm.useSecretCode) {
        data.secretCode = passwordForm.secretCode;
      } else {
        data.currentPassword = passwordForm.currentPassword;
      }

      await apiClient.changePassword(data);
      toast.success('Password changed successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        secretCode: '',
        newPassword: '',
        confirmPassword: '',
        useSecretCode: false,
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
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
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Father Name *
                </label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permanent Address (Native) *
                </label>
                <textarea
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Identity & Occupation */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity & Occupation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar Number *
                </label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  required
                  maxLength={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation *
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Student, Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College/Company/Institute Name *
                </label>
                <input
                  type="text"
                  name="collegeCompanyName"
                  value={formData.collegeCompanyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office/College/Institute Address (City)
                </label>
                <input
                  type="text"
                  name="officeAddress"
                  value={formData.officeAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Duration of Stay
                </label>
                <input
                  type="text"
                  name="expectedDurationStay"
                  value={formData.expectedDurationStay}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 6 months, 1 year"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation *
                </label>
                <input
                  type="text"
                  name="emergencyContactRelation"
                  value={formData.emergencyContactRelation}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Father, Mother, Brother"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Number *
                </label>
                <input
                  type="tel"
                  name="emergencyContactNumber"
                  value={formData.emergencyContactNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Password & Security</h2>
                <p className="text-sm text-gray-600 mt-1">Update your password to keep your account secure</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Password Change Modal */}
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          title="Change Password"
        >
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4">
              {/* Toggle between current password and secret code */}
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={!passwordForm.useSecretCode}
                    onChange={() => setPasswordForm({ ...passwordForm, useSecretCode: false, secretCode: '' })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Use Current Password</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={passwordForm.useSecretCode}
                    onChange={() => setPasswordForm({ ...passwordForm, useSecretCode: true, currentPassword: '' })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Use Secret Code</span>
                </label>
              </div>

              {/* Current Password OR Secret Code */}
              {!passwordForm.useSecretCode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required={!passwordForm.useSecretCode}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secret Code *
                  </label>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={passwordForm.secretCode}
                      onChange={(e) => setPasswordForm({ ...passwordForm, secretCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the secret code"
                      required={passwordForm.useSecretCode}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Contact admin if you forgot your password</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  minLength={6}
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ProfilePage;

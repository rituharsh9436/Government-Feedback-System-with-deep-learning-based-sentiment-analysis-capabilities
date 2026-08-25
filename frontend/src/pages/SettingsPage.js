import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import toast from 'react-hot-toast';
import { User, Lock, Trash2, AlertTriangle } from 'lucide-react';

export const SettingsPage = () => {
  const { user, refreshUser, logout } = useAuth();
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
  });

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) return;
    
    setIsUpdatingProfile(true);
    try {
      await authAPI.updateProfile({ full_name: profileForm.full_name });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(password)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character";
    return null;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    const pwdError = validatePassword(passwordForm.new_password);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount();
      toast.success('Account deleted successfully');
      // The logout function will clear local state and redirect to login
      await logout(); 
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your profile, security preferences, and account data.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white shadow-soft rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <User className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <Input value={user?.email || ''} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                <p className="mt-1 text-xs text-slate-500">Your email address cannot be changed.</p>
              </div>
              
              {user?.role === 'govt' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
                    <Input value={user?.department_name || ''} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department ID</label>
                    <Input value={user?.department_id || ''} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <Input 
                  value={profileForm.full_name} 
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  required
                  minLength="2"
                  maxLength="100"
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isUpdatingProfile || profileForm.full_name === user?.full_name}>
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white shadow-soft rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <Input 
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <Input 
                    type="password"
                    required
                    minLength="8"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <Input 
                    type="password"
                    required
                    minLength="8"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isUpdatingPassword || !passwordForm.current_password || !passwordForm.new_password}>
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow-soft rounded-xl border border-red-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-red-100 flex items-center gap-3 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Once you delete your account, there is no going back. Please be certain. All your data will be permanently removed.
            </p>
            
            {showDeleteConfirm ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-3">Are you absolutely sure you want to delete your account?</p>
                <div className="flex gap-3">
                  <Button variant="danger" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

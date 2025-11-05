import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import apiClient from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { firstName: string; lastName: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get user profile - cookies will be sent automatically
        const response = await apiClient.getProfile();
        setUser(response.user);
        setRetryCount(0); // Reset retry count on success
      } catch (error: any) {
        console.error('Failed to get profile:', error);

        // Only retry on network errors, not authentication errors
        if (error?.response?.status !== 401 && error?.response?.status !== 403 && retryCount < 2) {
          // Network error - retry after a short delay
          console.log(`Retrying authentication (attempt ${retryCount + 1})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
          return; // Don't set isLoading to false yet
        }

        // Authentication failed or max retries reached - user is not logged in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [retryCount]); // Re-run when retryCount changes

  const login = async (email: string, password: string) => {
    try {
      // Login endpoint now returns user in nested object
      const response = await apiClient.login({ email, password });

      // Set user from the nested user object in response
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear user state on logout
      setUser(null);
    }
  };

  const updateProfile = async (data: { firstName: string; lastName: string; phone?: string }) => {
    try {
      const response = await apiClient.updateProfile(data);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

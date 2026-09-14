import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loading, setLoading] = useState(false);
  const [otpUser, setOtpUser] = useState(null); // When OTP verification is required

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (role = 'OWNER') => {
    const demoUser = {
      userId: 'demo_user_123',
      _id: '66a69ca529a87e246bb9eebd',
      name: `Demo ${role.replace('_', ' ')}`,
      email: `${role.toLowerCase()}@inventryx.com`,
      phone: '+919876543210',
      role: role,
      companyId: '66a69ca529a87e246bb9eebd1',
      branchId: '66a69ca529a87e246bb9eebd2',
      phoneVerified: true,
      status: 'ACTIVE',
    };
    setUser(demoUser);
    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('token', 'demo_jwt_token_sample');
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setOtpUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        loginAsDemo,
        logout,
        loading,
        otpUser,
        setOtpUser,
        isAuthenticated: !!user,
        role: user?.role || null,
        companyId: user?.companyId || null,
        branchId: user?.branchId || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

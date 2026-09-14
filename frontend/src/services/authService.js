import api from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/login', { email, password });
    const token = res.token || res.data?.token;
    if (token) {
      localStorage.setItem('token', token);
    }
    return res;
  },

  verifyPhone: async (userId, otp) => {
    return await api.post('/verify-phone', { userId, otp });
  },

  resendPhoneOtp: async (userId) => {
    return await api.post('/resend-phone-otp', { userId });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

import api from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
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

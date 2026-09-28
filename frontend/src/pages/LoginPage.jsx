import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { PowerPlusLogo } from '../components/common/PowerPlusLogo';

export const LoginPage = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Password Reset Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message);
    }
  };

  const handleOpenResetModal = () => {
    setResetEmail(email || '');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
    setResetStep(1);
    setShowResetModal(true);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetError('');
    setResetSuccess('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your work email address');
      return;
    }
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await authService.forgotPassword(resetEmail.trim());
      if (res.success) {
        setResetStep(2);
        setCountdown(60);
        if (res.data?.devOtp) {
          setDevOtpHint(res.data.devOtp);
        } else {
          setDevOtpHint('');
        }
        setResetSuccess(res.message || 'OTP verification code generated.');
      } else {
        setResetError(res.message || 'Failed to send OTP code');
      }
    } catch (err) {
      setResetError(err.message || 'Failed to send OTP code');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setResetError('');
    try {
      const res = await authService.forgotPassword(resetEmail.trim());
      if (res.success) {
        setCountdown(60);
        if (res.data?.devOtp) {
          setDevOtpHint(res.data.devOtp);
        }
        setResetSuccess('A fresh 6-digit OTP code has been generated.');
      } else {
        setResetError(res.message || 'Failed to resend OTP code');
      }
    } catch (err) {
      setResetError(err.message || 'Failed to resend OTP code');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetOtp.trim()) {
      setResetError('Please enter the 6-digit OTP code');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await authService.resetPassword(
        resetEmail.trim(),
        resetOtp.trim(),
        newPassword
      );
      if (res.success) {
        setResetStep(3);
        setEmail(resetEmail.trim());
        setPassword('');
      } else {
        setResetError(res.message || 'Failed to reset password');
      }
    } catch (err) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blur Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Header Logo */}
        <div className="text-center">
          <PowerPlusLogo variant="login" />
          <p className="text-xs font-medium text-slate-400 mt-3">
            Multi-Branch Enterprise POS & Inventory System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Employee Login
          </h2>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Enter your credentials to access the operational dashboard
          </p>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Authentication Failed</span>
              </div>
              <p className="text-[11px] text-rose-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="input-tactile pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-tactile pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Server'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ==================================================== */}
      {/* PASSWORD RESET WITH EMAIL OTP VERIFICATION MODAL     */}
      {/* ==================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 shadow-2xl border border-slate-200 max-w-md w-full relative overflow-hidden">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleCloseResetModal}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Error & Info Feedback */}
            {resetError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && resetStep !== 3 && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {/* STEP 1: Enter Email & Send OTP */}
            {resetStep === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Reset Password
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verify your identity using an email OTP
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Enter your registered work email address. We will send you a 6-digit OTP code to verify your request.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="input-tactile pl-10"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseResetModal}
                      className="btn-secondary flex-1 justify-center py-2.5 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="btn-primary flex-1 justify-center py-2.5 text-xs font-bold"
                    >
                      {resetLoading ? 'Sending OTP...' : 'Send OTP Code'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: Enter OTP & New Password */}
            {resetStep === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Verify OTP & Reset
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-[240px]">
                      Code sent to {resetEmail}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {devOtpHint && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Email Credentials Not Configured</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        To receive emails in your real mailbox, configure <code className="bg-amber-100 font-mono px-1 py-0.5 rounded">EMAIL_USER</code> and <code className="bg-amber-100 font-mono px-1 py-0.5 rounded">EMAIL_PASS</code> in <code className="bg-amber-100 font-mono px-1 py-0.5 rounded">Server/.env</code>.
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="font-semibold text-amber-950">
                          Your OTP Code: <strong className="font-mono text-sm tracking-widest text-indigo-700 bg-white px-2 py-0.5 rounded border border-amber-300 ml-1">{devOtpHint}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setResetOtp(devOtpHint)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline ml-2 cursor-pointer"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || resending}
                        className={`text-xs font-semibold flex items-center gap-1 ${
                          countdown > 0
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="input-tactile text-center font-mono text-xl tracking-[0.4em] font-bold text-indigo-700 bg-indigo-50/50"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 mt-1 text-center">
                      Valid for 10 minutes. Check your inbox and spam folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="input-tactile pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="input-tactile pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setResetError('');
                      }}
                      className="btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="btn-primary flex-1 justify-center py-2.5 text-xs font-bold"
                    >
                      {resetLoading ? 'Updating Password...' : 'Save New Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: Success Screen */}
            {resetStep === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Your account password has been updated. You can now log in with your email and new password.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="btn-primary w-full justify-center py-3 text-sm font-bold"
                  >
                    Proceed to Login
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LoginPage;

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  allowGuestPreview?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  allowGuestPreview = true,
}) => {
  const {
    lang,
    setLang,
    firebaseUser,
    loginWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    checkEmailVerified,
    resetPassword,
    loginWithGoogle,
    logoutUser,
    isEmailVerificationPending,
    showToast,
    settings,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // If user is currently signed in but email is not verified, show verification view
  const currentView = (firebaseUser && !firebaseUser.emailVerified && isEmailVerificationPending) ? 'verify' : mode;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' : 'Please enter email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithEmail(email.trim(), password);
      if (!res.success) {
        if (res.needsVerification) {
          setMode('verify');
        } else {
          setErrorMessage(res.error || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed.'));
        }
      } else {
        if (onClose) onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!displayName.trim()) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে আপনার পুরো নাম লিখুন।' : 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা লিখুন।' : 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(lang === 'bn' ? 'পাসওয়ার্ড দুটি মিলছে না।' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerWithEmail(displayName.trim(), email.trim(), password);
      if (res.success) {
        setSuccessMessage(
          lang === 'bn'
            ? 'অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইলে ভেরিফিকেশন লিংক পাঠানো হয়েছে।'
            : 'Account created! Verification link sent to your email.'
        );
        setMode('verify');
      } else {
        setErrorMessage(res.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' : 'Registration failed.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে আপনার অ্যাকাউন্টের ইমেইল লিখুন।' : 'Please enter your account email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(email.trim());
      if (res.success) {
        setSuccessMessage(
          lang === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। ইনবক্স চেক করুন।'
            : 'Password reset link sent to your email. Check your inbox.'
        );
      } else {
        setErrorMessage(res.error || (lang === 'bn' ? 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।' : 'Password reset failed.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        showToast(
          lang === 'bn' ? 'ইমেইল সফলভাবে ভেরিফাই হয়েছে! স্বাগতম।' : 'Email verified successfully! Welcome.',
          'success'
        );
        if (onClose) onClose();
      } else {
        setErrorMessage(
          lang === 'bn'
            ? 'এখনও ভেরিফাই করা হয়নি। অনুগ্রহ করে ইনবক্স বা স্প্যাম ফোল্ডার দেখে লিংকে ক্লিক করুন।'
            : 'Not verified yet. Please check your inbox or spam folder and click the link.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await resendVerificationEmail();
      setSuccessMessage(
        lang === 'bn'
          ? 'নতুন ভেরিফিকেশন ইমেইল পাঠানো হয়েছে।'
          : 'A new verification email has been sent.'
      );
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top Header & Branding */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white text-center relative">
          {allowGuestPreview && onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Language Toggle */}
          <div className="absolute left-4 top-4 flex items-center rounded-lg bg-white/15 p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setLang('bn')}
              className={`px-2 py-0.5 rounded transition-colors ${lang === 'bn' ? 'bg-white text-blue-700 shadow-xs' : 'text-white/80 hover:text-white'}`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded transition-colors ${lang === 'en' ? 'bg-white text-blue-700 shadow-xs' : 'text-white/80 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner mt-2">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
            ) : (
              <Cpu className="h-8 w-8 text-white" />
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight">
            SmartIT <span className="text-blue-200">Pro</span>
          </h2>
          <p className="mt-1 text-xs text-blue-100/90">
            {lang === 'bn'
              ? 'ক্লাউড সিঙ্কড কম্পিউটার ও আইটি বিজনেস সিআরএম'
              : 'Cloud-Synchronized Computer & IT Hardware CRM'}
          </p>
        </div>

        {/* Status / Alert Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="leading-relaxed flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="leading-relaxed flex-1">{successMessage}</div>
          </div>
        )}

        {/* View Mode Switching */}
        {currentView === 'verify' ? (
          /* Email Verification View */
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3">
                <Mail className="h-7 w-7 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'ইমেইল ভেরিফিকেশন প্রয়োজন' : 'Email Verification Required'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {lang === 'bn'
                  ? 'আমরা আপনার ইমেইল ঠিকানায় একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। প্যানেলে কাজ শুরু করতে অনুগ্রহ করে লিংকে ক্লিক করুন:'
                  : 'We have sent a confirmation link to your email address. Please click the link to activate your access:'}
              </p>
              <div className="mt-2.5 rounded-lg bg-blue-50 border border-blue-200 py-1.5 px-3 text-xs font-semibold text-blue-800 break-all">
                {firebaseUser?.email || email}
              </div>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleCheckVerification}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isLoading ? (lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Checking...') : (lang === 'bn' ? 'ভেরিফিকেশন সম্পন্ন করেছি (চেক করুন)' : 'I Have Verified (Check Status)')}</span>
              </button>

              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5 text-slate-500" />
                <span>{lang === 'bn' ? 'পুনরায় ভেরিফিকেশন ইমেইল পাঠান' : 'Resend Verification Email'}</span>
              </button>

              <button
                onClick={logoutUser}
                className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-700 hover:underline transition-colors"
              >
                {lang === 'bn' ? 'অন্য অ্যাকাউন্ট দিয়ে লগইন করুন' : 'Sign in with another account'}
              </button>
            </div>
          </div>
        ) : currentView === 'forgot' ? (
          /* Forgot Password View */
          <div className="p-6">
            <div className="mb-4 text-center">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Your Password'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টের ইমেইল লিখুন। আমরা পাসওয়ার্ড পরিবর্তনের লিংক পাঠিয়ে দিব।'
                  : 'Enter your account email to receive a password recovery link.'}
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@smartit.com.bd"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span>{lang === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-slate-600 hover:text-blue-600 transition-colors"
              >
                ← {lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}
              </button>
            </form>
          </div>
        ) : (
          /* Login / Register Tab View */
          <div className="p-6">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  mode === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'লগইন' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  mode === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'রেজিস্ট্রেশন' : 'Register'}</span>
              </button>
            </div>

            {mode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@smartit.com.bd"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                </button>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'আপনার পুরো নাম' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={lang === 'bn' ? 'মোঃ মাহবুবুর রহমান' : 'Mahbubur Rahman'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@smartit.com.bd"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {lang === 'bn' ? 'এই ইমেইলে ভেরিফিকেশন লিংক পাঠানো হবে।' : 'Verification link will be sent to this email.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত' : 'Confirm'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50 mt-1"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>{lang === 'bn' ? 'রেজিস্ট্রেশন করুন (ভেরিফিকেশন সহ)' : 'Create Account with Email Verify'}</span>
                </button>
              </form>
            )}

            {/* Alternative: Google Sign-in */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">
                  {lang === 'bn' ? 'বা দ্রুত গুগল দিয়ে' : 'or continue with'}
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                await loginWithGoogle();
                if (onClose) onClose();
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{lang === 'bn' ? 'Google দিয়ে সরাসরি সাইন-ইন' : 'Continue with Google'}</span>
            </button>

            {/* Guest Preview Option */}
            {allowGuestPreview && onClose && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline transition-colors"
                >
                  {lang === 'bn'
                    ? 'লগইন না করে ডেমো মোডে প্রবেশ করুন →'
                    : 'Enter as Guest in Demo Mode →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer info banner */}
        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            {lang === 'bn'
              ? 'ক্লাউড ফায়ারস্টোর ডাটাবেস — সকল ডিভাইস থেকে একযোগে অ্যাক্সেসযোগ্য'
              : 'Cloud Firestore Database — Live Sync Across All Devices'}
          </span>
        </div>
      </div>
    </div>
  );
};

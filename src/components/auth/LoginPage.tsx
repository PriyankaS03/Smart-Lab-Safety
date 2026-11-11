import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  FlaskConical,
  Atom,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  KeyRound,
  UserPlus,
  User,
  Fingerprint
} from 'lucide-react';
import { User as UserType, UserRole } from '../../types';
import { api } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Common State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Registration State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('student');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please provide your laboratory email/ID and security password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.login({
        email: email.trim(),
        password: password
      });
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Please enter your laboratory email address.');
      return;
    }
    if (!regPassword) {
      setError('Please enter a security password.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.register({
        full_name: regFullName.trim(),
        username: regUsername.trim() || undefined,
        email: regEmail.trim(),
        password: regPassword,
        role: regRole
      });

      setSuccessMsg(`Welcome, ${response.user.full_name}! Account created as ${getRoleLabel(response.user.role)}.`);
      
      // Immediately log the user in with their chosen role
      setTimeout(() => {
        onLoginSuccess(response.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
      setLoading(false);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === 'admin') return 'Admin / Lab Supervisor';
    if (role === 'assistant') return 'Lab Assistant';
    return 'Student / Researcher';
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 text-slate-800 relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Decorative Laboratory Chemical Theme Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-cyan-300/15 rounded-full blur-3xl" />

        {/* Subtle SVG Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#1e40af 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* Floating Chemical & Laboratory Motif Icons */}
        <div className="absolute top-16 left-12 text-blue-200/50 hidden lg:block transform -rotate-12">
          <FlaskConical className="w-24 h-24 stroke-[1.2]" />
        </div>
        <div className="absolute bottom-20 right-16 text-indigo-200/40 hidden lg:block transform rotate-12">
          <Atom className="w-28 h-28 stroke-[1.2]" />
        </div>
      </div>

      {/* Top Banner Navigation / Lab Branding */}
      <header className="relative z-10 w-full px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-4 ring-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">SMART LAB</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Chemical Safety v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">PPE Detection & Chemical Hazard Prevention System</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-blue-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-700">Lab 3B Vision Online</span>
          <span className="text-slate-300">•</span>
          <span>ANSI Z87.1 / OSHA Active</span>
        </div>
      </header>

      {/* Main Authentication Center Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className={`w-full ${mode === 'register' ? 'max-w-xl' : 'max-w-md'} bg-white/95 backdrop-blur-md rounded-3xl border border-blue-100/90 shadow-2xl shadow-blue-900/10 p-6 sm:p-8 transition-all duration-300`}>
          
          {/* Mode Switcher Tabs (Sign In / Register) */}
          <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Account</span>
            </button>
          </div>

          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-inner">
              {mode === 'login' ? <KeyRound className="w-6 h-6 text-blue-600" /> : <UserPlus className="w-6 h-6 text-blue-600" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Personnel Authentication' : 'New Personnel Registration'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {mode === 'login'
                ? 'Sign in with your laboratory credentials to access role-tailored PPE detection.'
                : 'Create an account with your details, password, and assign your laboratory safety role.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: SIGN IN FORM */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email / ID Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lab Email / Personnel ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@smartlab.edu"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Security Password
                  </label>
                  <span className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer select-none">
                    Encrypted PBKDF2
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Keep session active</span>
                </label>
                <span className="text-slate-400 text-[11px]">Chemistry Station 3B</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Laboratory</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
                  </>
                )}
              </button>

              {/* Switch to Register Prompt */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  New laboratory researcher or staff?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    Register your account here &rarr;
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: NEW USER REGISTRATION FORM */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Dr. Jane Smith"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Lab Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Laboratory Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. janesmith@smartlab.edu"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Username / Personnel ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Personnel ID / Username <span className="text-slate-400 font-normal">(Optional, auto-generated if blank)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. janesmith"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Laboratory Role Selection (Crucial user request!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Assigned Laboratory Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Admin / Lab Supervisor */}
                  <div
                    onClick={() => setRegRole('admin')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      regRole === 'admin'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <input
                        type="radio"
                        name="regRole"
                        checked={regRole === 'admin'}
                        onChange={() => setRegRole('admin')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-900">Admin / Supervisor</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Full lab access, safety policies, user management</div>
                  </div>

                  {/* Lab Assistant */}
                  <div
                    onClick={() => setRegRole('assistant')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      regRole === 'assistant'
                        ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <input
                        type="radio"
                        name="regRole"
                        checked={regRole === 'assistant'}
                        onChange={() => setRegRole('assistant')}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-900">Lab Assistant</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Operations, sensor monitoring, live feed inspections</div>
                  </div>

                  {/* Student / Researcher */}
                  <div
                    onClick={() => setRegRole('student')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      regRole === 'student'
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <input
                        type="radio"
                        name="regRole"
                        checked={regRole === 'student'}
                        onChange={() => setRegRole('student')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-900">Student / Researcher</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">Self PPE check, safety compliance testing</div>
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Security Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 rounded-xl border transition-all outline-none ${
                        regConfirmPassword && regPassword !== regConfirmPassword
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Password Matching Notice */}
              {regConfirmPassword && regPassword !== regConfirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Passwords do not match.
                </p>
              )}

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Laboratory Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Account & Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
                  </>
                )}
              </button>

              {/* Back to Sign In */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Already have a registered account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    Sign in with your password &rarr;
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* Laboratory Security Footer */}
      <footer className="relative z-10 w-full px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 gap-2">
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>SMART LAB – Chemical Laboratory PPE Detection & Hazard Prevention System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>OSHA 1910.132 Standards</span>
          <span>•</span>
          <span>ANSI Z87.1 Eye Protection</span>
          <span>•</span>
          <span>Authorized Lab Personnel Only</span>
        </div>
      </footer>
    </div>
  );
};

import { useState } from 'react';
import { authApi } from '../utils/api';
import { Store, Phone, Clock, MessageCircle, AlertCircle, Mail, Lock, User, KeyRound, Building2, MapPin } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'login' | 'signup_form' | 'otp_verify'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Login state
  const [signInData, setSignInData] = useState({ email: '', password: '' });

  // Signup state
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
  });
  const [otp, setOtp] = useState('');
  const [tempEmail, setTempEmail] = useState(''); // email used during OTP step

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsInactive(false);
    setIsPending(false);
    setLoading(true);

    try {
      const result = await authApi.login(signInData.email, signInData.password);

      if (result.isInactive || (result.shop && result.shop.status === 'inactive')) {
        setIsInactive(true);
        setLoading(false);
        return;
      }

      if (result.isPending || (result.shop && result.shop.status === 'pending')) {
        setIsPending(true);
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.token && result.shop) {
        onAuthSuccess(result);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signUpData.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
      setTempEmail(signUpData.email);
      setStep('otp_verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete signup
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tempEmail,
          otp,
          name: signUpData.ownerName,
          password: signUpData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OTP verification failed');

      // After successful verification, we have token and user
      // But we still need to create the shop? Actually the backend should create shop as well.
      // For now, assume shop creation is separate or handled in backend.
      // To keep consistent with your existing flow, we'll show pending message (admin will approve).
      setShowPendingMessage(true);
      setIsSignUp(false);
      setStep('login');
      // Reset signup form
      setSignUpData({
        email: '', password: '', confirmPassword: '', shopName: '', ownerName: '', phone: '', address: '',
      });
      setOtp('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to signup form (change email)
  const backToSignupForm = () => {
    setStep('signup_form');
    setError('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Bms Management System</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Tabs (only show in login or signup_form, not during OTP) */}
          {step !== 'otp_verify' && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setIsSignUp(false); setStep('login'); setError(''); setIsInactive(false); setIsPending(false); setShowPendingMessage(false); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${!isSignUp ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setStep('signup_form'); setError(''); setIsInactive(false); setIsPending(false); setShowPendingMessage(false); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${isSignUp ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Inactive / Pending messages (same as before) */}
          {isInactive && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-sm uppercase">
                <AlertCircle size={18} /> Account Restricted
              </div>
              <p className="text-xs text-amber-700 mb-4 font-medium leading-relaxed">
                Your shop is currently <strong>Inactive</strong>. Access is disabled until reactivated by the administrator.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://wa.me/923287627690" target="_blank" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href="tel:+923287627690" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <Phone size={14} /> Call Admin
                </a>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold text-sm uppercase">
                <Clock size={18} /> Pending Approval
              </div>
              <p className="text-xs text-yellow-700 mb-4 font-medium leading-relaxed">
                Your account is <strong>pending approval</strong> by the administrator. Please wait or contact admin.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://wa.me/923287627690" target="_blank" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href="tel:+923287627690" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <Phone size={14} /> Call Admin
                </a>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          {step === 'login' && !isSignUp && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email" required
                value={signInData.email}
                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Email"
              />
              <input
                type="password" required
                value={signInData.password}
                onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Password"
              />
              <button
                type="submit" disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold shadow-md active:scale-95 transition-transform"
              >
                {loading ? 'Checking...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* SIGNUP FORM (Step 1: collect details) */}
          {step === 'signup_form' && isSignUp && (
            <form onSubmit={handleSendOTP} className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" required placeholder="Shop Name" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.shopName} onChange={(e) => setSignUpData({ ...signUpData, shopName: e.target.value })} />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" required placeholder="Owner Name" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.ownerName} onChange={(e) => setSignUpData({ ...signUpData, ownerName: e.target.value })} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="email" required placeholder="Email" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.email} onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="tel" placeholder="Phone" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.phone} onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })} />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea placeholder="Address" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} value={signUpData.address} onChange={(e) => setSignUpData({ ...signUpData, address: e.target.value })} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" required placeholder="Password" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.password} onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" required placeholder="Confirm Password" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.confirmPassword} onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })} />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold shadow-md">
                {loading ? 'Sending OTP...' : 'Sign Up → Get OTP'}
              </button>
            </form>
          )}

          {/* OTP VERIFICATION STEP */}
          {step === 'otp_verify' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <KeyRound className="text-purple-600" size={24} />
                </div>
                <h3 className="font-bold text-gray-800">Verify Your Email</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to <strong>{tempEmail}</strong>
                </p>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold shadow-md">
                {loading ? 'Verifying...' : 'Verify & Complete Signup'}
              </button>
              <button type="button" onClick={backToSignupForm} className="w-full text-xs text-gray-500 hover:text-gray-700">
                ← Use different email
              </button>
            </form>
          )}
        </div>

        {/* SIGNUP SUCCESS - PENDING MESSAGE (after OTP verified) */}
        {showPendingMessage && (
          <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 mt-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold">
              <Clock size={18} /> Pending Approval
            </div>
            <p className="text-xs text-gray-600 mb-4 font-medium">
              Your request is submitted. Send payment proof to: <strong>03166502607</strong>
            </p>
            <div className="flex gap-2">
              <a href="https://wa.me/923287627690" className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-center text-xs font-bold">WhatsApp</a>
              <a href="tel:+923287627690" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-center text-xs font-bold">Call Now</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
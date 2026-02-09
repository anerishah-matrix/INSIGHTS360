import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const Signup = () => {
    const [step, setStep] = useState(1); // 1: Signup, 2: Verification
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, verifySignup } = useAuth();
    const navigate = useNavigate();

    const validatePassword = (pass) => {
        const regex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
        return regex.test(pass);
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePassword(password)) {
            return setError('Password must be at least 6 characters and contain at least one special character.');
        }

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        try {
            await signup(name, email, password);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifySignup(email, verificationCode);
            navigate('/login', { state: { message: 'Verification successful! You can now log in.' } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <AuthLayout
                title="Verify Email"
                subtitle={`We've sent a 6-digit code to ${email}`}
            >
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Verification Code</label>
                        <input
                            type="text"
                            required
                            maxLength="6"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-center text-2xl tracking-[10px] text-gray-900"
                            placeholder="000000"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-[13px] font-bold">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? 'Verifying...' : 'Verify & Create Account'}
                    </button>

                    <div className="text-center pt-2">
                        <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-bold hover:text-gray-700 text-[14px]">Edit registration details</button>
                    </div>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Start monitoring your business impact"
        >
            <form onSubmit={handleSignupSubmit} className="space-y-5">
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        placeholder="name@company.com"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        placeholder="••••••••"
                    />
                    <p className="mt-2 text-[10px] text-gray-400 font-medium px-1">Min 6 characters with at least one special digit (!@#$%^&*)</p>
                </div>
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                    <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-[13px] font-bold">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {loading ? 'Sending Code...' : 'Create Account'}
                </button>

                <div className="text-center pt-2">
                    <p className="text-gray-500 font-medium text-[14px]">
                        Already have an account? <Link to="/login" title="Go to login page" id="login-link" className="text-blue-600 font-bold hover:underline">Sign in</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Signup;

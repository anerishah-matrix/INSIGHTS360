import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Request Email, 2: Enter Code & New Password
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { requestPasswordReset, resetPassword } = useAuth();
    const navigate = useNavigate();

    const validatePassword = (pass) => {
        const regex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
        return regex.test(pass);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await requestPasswordReset(email);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!validatePassword(newPassword)) {
            return setError('Password must be at least 6 characters and contain at least one special character.');
        }

        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        try {
            await resetPassword(email, verificationCode, newPassword);
            setMessage('Password updated successfully! Redirecting...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        return (
            <AuthLayout
                title="Reset Password"
                subtitle={`Enter the 6-digit code sent to ${email}`}
            >
                <form onSubmit={handleResetSubmit} className="space-y-6">
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
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                            placeholder="••••••••"
                        />
                        <p className="mt-2 text-[10px] text-gray-400 font-medium px-1">Min 6 characters with at least one special digit (!@#$%^&*)</p>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
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

                    {message && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 text-[13px] font-bold">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>

                    <div className="text-center pt-2">
                        <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-bold hover:text-gray-700 text-[14px]">Back to Email</button>
                    </div>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot Password"
            subtitle="Enter your email to receive a reset code"
        >
            <form onSubmit={handleRequestSubmit} className="space-y-6">
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
                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                </button>

                <div className="text-center pt-2">
                    <Link to="/login" title="Return to login page" id="back-to-login" className="text-blue-600 font-bold hover:underline text-[14px]">Back to Sign In</Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ForgotPassword;

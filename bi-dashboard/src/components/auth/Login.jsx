import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Sign in to your Impact.ai dashboard"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <Link to="/forgot-password" title="Go to forgot password" id="forgot-password" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">Forgot?</Link>
                    </div>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="text-center pt-4">
                    <p className="text-gray-500 font-medium text-[14px]">
                        Don't have an account? <Link to="/signup" title="Go to signup page" id="signup-link" className="text-blue-600 font-bold hover:underline">Create one</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;

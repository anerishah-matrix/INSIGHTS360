import React from 'react';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[40px] overflow-hidden p-10">
                    <div className="mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-6 shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{title}</h1>
                        <p className="text-gray-500 font-medium">{subtitle}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;

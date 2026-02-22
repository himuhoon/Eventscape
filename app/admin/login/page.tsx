"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/admin";
    const authError = searchParams.get("error");

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signIn("google", { callbackUrl });
        } catch {
            setError("Sign-in failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="relative z-10 w-full max-w-md px-4">
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
                <div className="h-1 w-full bg-gradient-to-r from-[#3713ec] via-violet-500 to-[#3713ec]" />

                <div className="p-10">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-[#3713ec] flex items-center justify-center mb-4 shadow-lg shadow-[#3713ec]/30">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: "28px" }}>auto_awesome</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Admin Access</h1>
                        <p className="text-sm text-slate-400 mt-1 text-center">
                            Sign in with your Google account to access the event management dashboard
                        </p>
                    </div>

                    {/* Error */}
                    {(error || authError) && (
                        <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-500" style={{ fontSize: "18px" }}>error</span>
                            <p className="text-sm text-rose-400">
                                {error || (authError === "OAuthAccountNotLinked"
                                    ? "This Google account is not linked to an admin account."
                                    : "Authentication failed. Please try again.")}
                            </p>
                        </div>
                    )}

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-[#3713ec]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {loading ? "Signing in…" : "Continue with Google"}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <span className="text-xs text-slate-500 font-medium">OR</span>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>

                    {/* SSO placeholder */}
                    <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/[0.08] text-slate-400 font-medium py-3.5 px-6 rounded-xl transition-all cursor-not-allowed opacity-50"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>corporate_fare</span>
                        Use SSO Credentials
                        <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded ml-1">Soon</span>
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed">
                        Access is restricted to authorized administrators only.
                        <br />
                        Contact your system admin if you need access.
                    </p>
                </div>

                <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#3713ec]/40 to-transparent" />
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
            <div className="absolute inset-0 glow-bg pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#3713ec]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* useSearchParams must be inside Suspense for static generation to work */}
            <Suspense fallback={
                <div className="relative z-10 w-full max-w-md px-4">
                    <div className="glass-card rounded-2xl p-10 flex items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-[#3713ec]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                </div>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}

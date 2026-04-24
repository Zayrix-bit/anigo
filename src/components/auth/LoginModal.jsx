import { useState, useEffect } from "react";
import { login, register } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { Check, X } from "lucide-react";

export default function LoginModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cfSuccess, setCfSuccess] = useState(false);
  const { loginAuth } = useAuth();

  useEffect(() => {
    if (isOpen) {
      // Simulate Cloudflare turnstile success after 1 second
      const timer = setTimeout(() => setCfSuccess(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setCfSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await login(email, password);
        if (res.token) {
          loginAuth(res.user, res.token);
          onClose();
        } else {
          setError(res.message || "Login failed");
        }
      } else {
        const res = await register(username, email, password);
        if (res.token) {
          loginAuth(res.user, res.token);
          onClose();
        } else {
          setError(res.message || "Registration failed");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-[#1a1a1a] w-[380px] shadow-2xl animate-in zoom-in-95 duration-200 relative font-sans">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-0 right-0 p-3 text-white/40 hover:text-white transition-colors bg-[#111111]"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-[17px] font-bold text-white mb-1">
              {isLogin ? "SIGN IN" : "SIGN UP"}
            </h2>
            <p className="text-white/40 text-[12px]">
              {isLogin ? "Welcome back!" : "Create an account to explore more features."}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 mb-3 text-[12px] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" autoComplete="off">
            {/* Username Input (Only for Signup) */}
            {!isLogin && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="new-username"
                className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
                required
              />
            )}
            
            {/* Email Input */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="new-email"
              className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
              required
            />

            {/* Password Input */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
              required
            />

            {/* Repeat Password (Only for Signup) */}
            {!isLogin && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
                required
              />
            )}

            {/* Cloudflare Mock */}
            <div className="border border-white/20 p-2 mt-1 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-colors ${cfSuccess ? 'bg-[#31a153]' : 'bg-transparent border border-white/20'}`}>
                  {cfSuccess && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-white/80 text-[12px] font-medium">{cfSuccess ? "Success!" : "Verifying..."}</span>
              </div>
              <div className="flex flex-col items-end">
                {/* Cloudflare logo mock */}
                <svg viewBox="0 0 48 24" className="h-3 text-[#f48120] fill-current">
                  <path d="M41.5,14c-1.3,0-2.4,0.3-3.4,0.9c-0.8-3.1-3.6-5.4-7-5.4c-0.5,0-0.9,0.1-1.4,0.2C28.5,5.2,24,2,18.7,2 C12.2,2,6.7,6.8,5.5,13.1c-3.1,0.6-5.5,3.3-5.5,6.6C0,23.6,3.1,26.7,7,26.7h34.5c3.6,0,6.5-2.9,6.5-6.5S45.1,14,41.5,14z" />
                </svg>
                <div className="flex items-center gap-1 mt-0.5 text-[8.5px] text-white/50">
                  <a href="#" className="hover:underline">Privacy</a>
                  <span>•</span>
                  <a href="#" className="hover:underline">Terms</a>
                </div>
              </div>
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="text-center mt-0.5 mb-0.5">
                <button type="button" className="text-[13px] text-white/80 hover:text-white transition-colors">
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !cfSuccess}
              className="w-full bg-[#E50914] hover:bg-[#f40612] text-white font-bold text-[13px] py-2.5 mt-1 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "PLEASE WAIT..." : isLogin ? "SIGN IN" : "SIGN UP"}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-4 text-center text-white/40 text-[13px]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setEmail("");
                setPassword("");
                setUsername("");
                setConfirmPassword("");
              }}
              className="text-white hover:underline transition-colors font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from './App';

interface LoginProps {
  onSuccess: () => void;
  lang: 'zh' | 'en';
  onToggleLang: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, lang, onToggleLang }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const isZh = lang === 'zh';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(isZh ? '请填写邮箱和密码！' : 'Please fill in both email and password!');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(isZh ? '密码长度不能少于 6 位！' : 'Password must be at least 6 characters!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      if (isSignUp) {
        // 注册请求（带邮件重定向地址，确保点开验证链接跳回真实部署网址）
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          alert(isZh ? '🎉 注册成功！已自动登录。' : '🎉 Sign up successful! Logged in.');
          onSuccess();
        } else {
          // 保留邮箱验证时的正常流程提示
          setInfoMsg(
            isZh
              ? '📩 验证邮件已成功发送至您的邮箱！请前往邮箱点击验证链接，完成后返回此处登录。'
              : '📩 Confirmation email sent! Please check your inbox and verify your account before signing in.'
          );
        }
      } else {
        // 登录请求
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setErrorMsg(isZh ? '❌ 邮箱尚未验证，请先前往邮箱点击验证链接！' : '❌ Email not confirmed yet. Please verify your email first.');
          } else {
            setErrorMsg(error.message);
          }
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (isZh ? '网络连接失败，请重试！' : 'Network error, please try again!'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-4 z-50 font-sans">
      <div className="w-full max-w-sm bg-slate-800 rounded-3xl p-6 border-2 border-slate-700 shadow-2xl text-center space-y-6 relative">
        <button
          type="button"
          onClick={onToggleLang}
          className="absolute top-4 right-4 text-xs bg-slate-700 hover:bg-slate-600 font-extrabold px-2.5 py-1 rounded-xl border border-slate-600 transition-all text-slate-200"
        >
          🌐 {isZh ? 'EN' : '中文'}
        </button>

        <div className="w-20 h-20 bg-green-500 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg border-b-4 border-green-700 pt-1">
          🦉
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-wide">
            {isSignUp 
              ? (isZh ? '创建新账号' : 'Create Account') 
              : (isZh ? '知识复习打卡' : 'Review & Study Check-in')}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {isSignUp 
              ? (isZh ? '开启你的 1-3-5-7 艾宾浩斯记忆之旅' : 'Start your 1-3-5-7 memory journey') 
              : (isZh ? '欢迎回来！请登录你的专属复习空间' : 'Welcome back! Sign in to continue')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              {isZh ? '邮箱账号' : 'Email Address'}
            </label>
            <input
              type="email"
              placeholder={isZh ? '请输入你的邮箱' : 'Enter your email'}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border-2 border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              {isZh ? '密码' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isZh ? '请输入 6 位以上的密码' : 'At least 6 characters'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-slate-900 border-2 border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-white p-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs text-center animate-bounce">
              ❌ {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p className="text-amber-300 text-xs text-center leading-relaxed bg-amber-950/40 p-3 rounded-xl border border-amber-800/50">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 active:translate-y-1 text-white font-extrabold rounded-2xl border-b-4 border-green-700 transition-all shadow-lg active:border-b-0 disabled:opacity-50"
          >
            {loading 
              ? (isZh ? '正在发送验证邮件...' : 'Sending Email...') 
              : isSignUp 
                ? (isZh ? '发送验证邮件并注册 🚀' : 'Send Email & Register 🚀') 
                : (isZh ? '登 录 🔓' : 'Sign In 🔓')}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            {isSignUp ? (isZh ? '已有账号？' : 'Already have an account?') : (isZh ? '还没有账号？' : "Don't have an account?")}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className="text-green-400 hover:text-green-300 font-extrabold underline"
          >
            {isSignUp ? (isZh ? '直接登录 ➔' : 'Sign In ➔') : (isZh ? '免费注册新账号 ➔' : 'Sign Up ➔')}
          </button>
        </div>
      </div>
    </div>
  );
};
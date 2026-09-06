import React, { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Languages, LockKeyhole, Mail } from 'lucide-react';
import { getNetworkErrorMessage, supabase } from './App';

interface LoginProps {
  onSuccess: () => void;
  lang: 'zh' | 'en';
  onToggleLang: () => void;
  initialError?: string;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, lang, onToggleLang, initialError = '' }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError);
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
      setErrorMsg(getNetworkErrorMessage(
        err,
        isZh ? '网络连接失败，请检查网络后重试！' : 'Network error, please try again!'
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f6fa] p-4 font-sans text-[#1b1d2a]">
      <div className="relative w-full max-w-sm space-y-6 rounded-[28px] border border-[#e5e7ef] bg-white p-7 text-center shadow-[0_24px_70px_rgba(31,35,55,0.13)]">
        <button
          type="button"
          onClick={onToggleLang}
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-[#e5e7ef] bg-[#f8f9fc] px-2.5 py-1.5 text-[10px] font-extrabold text-[#63687b] transition-all hover:border-[#bcb8ff] hover:text-[#635bff]"
        >
          <Languages size={13} /> {isZh ? 'EN' : '中文'}
        </button>

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#7770ff] to-[#5148ef] text-white shadow-[0_12px_28px_rgba(99,91,255,0.28)]">
          <Check size={30} strokeWidth={2.2} />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-[-0.04em] text-[#202230]">
            {isSignUp 
              ? (isZh ? '创建新账号' : 'Create Account') 
              : (isZh ? '知识复习打卡' : 'Review & Study Check-in')}
          </h1>
          <p className="mt-2 text-xs font-medium text-[#858a9d]">
            {isSignUp 
              ? (isZh ? '开启你的 1-3-5-7 艾宾浩斯记忆之旅' : 'Start your 1-3-5-7 memory journey') 
              : (isZh ? '欢迎回来！请登录你的专属复习空间' : 'Welcome back! Sign in to continue')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#55596c]">
              {isZh ? '邮箱账号' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9eaf]" />
              <input
                type="email"
                placeholder={isZh ? '请输入你的邮箱' : 'Enter your email'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full rounded-2xl border border-[#e1e3eb] bg-[#f8f9fc] py-3 pl-10 pr-4 text-sm text-[#292c3b] outline-none transition-all placeholder:text-[#a3a7b7] focus:border-[#aaa5ff] focus:ring-4 focus:ring-[#efefff]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#55596c]">
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
                className="w-full rounded-2xl border border-[#e1e3eb] bg-[#f8f9fc] py-3 pl-10 pr-12 text-sm text-[#292c3b] outline-none transition-all placeholder:text-[#a3a7b7] focus:border-[#aaa5ff] focus:ring-4 focus:ring-[#efefff]"
              />
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9eaf]" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8f93a5] hover:text-[#635bff]"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-red-50 p-2.5 text-center text-xs font-semibold text-red-600">
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-xs leading-relaxed text-amber-700">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#635bff] py-3.5 font-extrabold text-white shadow-[0_10px_22px_rgba(99,91,255,0.26)] transition-all hover:bg-[#554ce8] disabled:opacity-50"
          >
            {loading 
              ? (isZh ? '正在发送验证邮件...' : 'Sending Email...') 
              : isSignUp 
                ? (isZh ? '发送验证邮件并注册' : 'Send Email & Register')
                : (isZh ? '登录' : 'Sign In')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="flex items-center justify-between border-t border-[#eceef3] pt-4 text-xs">
          <span className="text-[#858a9d]">
            {isSignUp ? (isZh ? '已有账号？' : 'Already have an account?') : (isZh ? '还没有账号？' : "Don't have an account?")}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className="font-extrabold text-[#635bff] hover:text-[#5148df]"
          >
            {isSignUp ? (isZh ? '直接登录 ➔' : 'Sign In ➔') : (isZh ? '免费注册新账号 ➔' : 'Sign Up ➔')}
          </button>
        </div>
      </div>
    </div>
  );
};

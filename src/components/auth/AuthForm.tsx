"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "reset";

function normalizeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/profile";
}

export function AuthForm({
  initialMode = "signin",
  next = "/profile",
  initialMessage = "",
}: {
  initialMode?: AuthMode;
  next?: string;
  initialMessage?: string;
}) {
  const safeNext = useMemo(() => normalizeNext(next), [next]);
  const inFlightRef = useRef(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [isError, setIsError] = useState(Boolean(initialMessage));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setMessage(mode === "signin" ? "正在登录，请稍候…" : mode === "signup" ? "正在创建账号…" : "正在发送重置邮件…");
    setIsError(false);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase 尚未配置。请先在 .env.local 中填写项目 URL 和 Publishable Key。");
      }

      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 客户端初始化失败。");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace(safeNext);
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) throw new Error("密码至少需要 8 位。");

        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", safeNext);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback.toString() },
        });
        if (error) throw error;

        if (data.session) {
          window.location.replace(safeNext);
          return;
        }

        setMessage("注册邮件已发送。请在电脑浏览器中打开确认链接；确认后即可使用邮箱和密码登录。");
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/auth/update-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callback.toString(),
      });
      if (error) throw error;
      setMessage("密码重置邮件已发送，请检查邮箱。");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    if (loading) return;
    setMode(nextMode);
    setMessage("");
    setIsError(false);
  }

  const title = mode === "signin" ? "登录浮生" : mode === "signup" ? "创建账号" : "重置密码";
  const description =
    mode === "signin"
      ? "登录后可进入你的私有空间，并把本机命盘、对话与手串同步到账号。"
      : mode === "signup"
        ? "使用邮箱创建浮生账号。邮箱确认用于保护你的生辰与对话数据。"
        : "输入注册邮箱，我们会向你发送密码重置链接。";

  return (
    <section className="card mx-auto max-w-lg p-7 sm:p-9" aria-busy={loading}>
      <p className="eyebrow">私密账号空间</p>
      <h1 className="mt-3 font-serif text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

      {mode !== "reset" && (
        <div className="mt-7 grid grid-cols-2 rounded-2xl bg-brand-50 p-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("signin")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              mode === "signin" ? "bg-white text-brand-800 shadow-sm" : "text-muted"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("signup")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              mode === "signup" ? "bg-white text-brand-800 shadow-sm" : "text-muted"
            }`}
          >
            注册
          </button>
        </div>
      )}

      <form onSubmit={submit} className="mt-6">
        <label className="label" htmlFor="auth-email">邮箱地址</label>
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 text-brand-600" size={18} />
          <input
            id="auth-email"
            required
            disabled={loading}
            type="email"
            autoComplete="email"
            className="field pl-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </div>

        {mode !== "reset" && (
          <>
            <label className="label mt-5" htmlFor="auth-password">密码</label>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-3.5 text-brand-600" size={18} />
              <input
                id="auth-password"
                required
                disabled={loading}
                minLength={8}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="field px-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-2.5 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-brand-50"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        )}

        <button disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : mode === "signup" ? (
            <UserPlus size={18} />
          ) : mode === "reset" ? (
            <Mail size={18} />
          ) : (
            <LockKeyhole size={18} />
          )}
          {loading
            ? mode === "signin" ? "正在登录…" : mode === "signup" ? "正在创建…" : "正在发送…"
            : mode === "signin" ? "登录" : mode === "signup" ? "创建账号" : "发送重置邮件"}
        </button>
      </form>

      {mode === "signin" && (
        <button
          type="button"
          disabled={loading}
          className="mt-4 w-full text-center text-sm text-brand-700 hover:underline"
          onClick={() => switchMode("reset")}
        >
          忘记密码？
        </button>
      )}

      {mode === "reset" && (
        <button
          type="button"
          disabled={loading}
          className="mt-4 w-full text-center text-sm text-brand-700 hover:underline"
          onClick={() => switchMode("signin")}
        >
          返回登录
        </button>
      )}

      {message && (
        <p className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${isError ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-900"}`}>
          {message}
        </p>
      )}

      <p className="mt-6 text-xs leading-5 text-muted">
        账号用于同步命盘、对话与设计。登录按钮提交后会立即锁定，避免重复请求。
      </p>
    </section>
  );
}

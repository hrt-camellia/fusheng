"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("密码至少需要 8 位。");
      return;
    }
    if (password !== confirm) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase 尚未配置。");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg p-7 sm:p-9">
      <p className="eyebrow">账号安全</p>
      <h1 className="mt-3 font-serif text-4xl">设置新密码</h1>
      <p className="mt-3 text-sm leading-6 text-muted">请输入不少于 8 位的新密码。</p>

      <label className="label mt-7" htmlFor="new-password">新密码</label>
      <div className="relative">
        <LockKeyhole className="absolute left-4 top-3.5 text-brand-600" size={18} />
        <input
          id="new-password"
          required
          minLength={8}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          className="field px-11"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((value) => !value)}
          className="absolute right-3 top-2.5 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-brand-50"
          aria-label={show ? "隐藏密码" : "显示密码"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <label className="label mt-5" htmlFor="confirm-password">再次输入</label>
      <input
        id="confirm-password"
        required
        minLength={8}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        className="field"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />

      <button disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? <LoaderCircle className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
        保存新密码
      </button>
      {message && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    </form>
  );
}

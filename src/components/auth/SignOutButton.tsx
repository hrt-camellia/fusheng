"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 尚未配置。");
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      window.location.replace("/");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "退出失败，请稍后重试。");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="btn-secondary w-full"
      >
        {loading ? <LoaderCircle className="animate-spin" size={18} /> : <LogOut size={18} />}
        {loading ? "正在退出…" : "退出登录"}
      </button>
      {error && <p className="mt-3 text-xs leading-5 text-red-600">{error}</p>}
    </div>
  );
}

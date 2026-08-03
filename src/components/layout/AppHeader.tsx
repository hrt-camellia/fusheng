import Link from "next/link";
import { Sparkles, UserRound } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { createClient } from "@/lib/supabase/server";

const nav = [
  ["八字命盘", "/bazi"],
  ["问浮生", "/chat"],
  ["每日运势", "/fortune"],
  ["水晶手串", "/bracelet"],
  ["历史记录", "/history"],
];

export async function AppHeader() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data.user;

  return (
    <header className="site-header sticky top-0 z-40 border-b border-brand-100 bg-brand-50/90 backdrop-blur-xl">
      <div className="shell flex h-[72px] items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-soft">
            <Sparkles size={20} />
          </span>
          <span className="min-w-0">
            <strong className="block font-serif text-xl tracking-[0.2em]">浮生</strong>
            <small className="hidden truncate text-muted sm:block">看见自己，再做选择</small>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white hover:text-brand-800"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          {user ? (
            <Link href="/profile" className="btn-secondary !px-4 !py-2 text-sm" title={user.email || "个人中心"}>
              <UserRound size={17} />
              <span className="hidden max-w-28 truncate sm:inline">{user.email?.split("@")[0] || "我的"}</span>
            </Link>
          ) : (
            <Link href="/auth" className="btn-secondary !px-4 !py-2 text-sm">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

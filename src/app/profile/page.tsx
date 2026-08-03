import Link from "next/link";
import { redirect } from "next/navigation";
import { Cloud, Database, Gem, History, Mail, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { CloudMigrationPanel } from "@/components/cloud/CloudMigrationPanel";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "个人中心" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data.user;
  if (!user) redirect("/auth?next=/profile");

  return (
    <div className="shell py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-7 sm:p-10">
          <p className="eyebrow">我的浮生</p>
          <h1 className="mt-3 font-serif text-4xl">个人中心</h1>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-brand-50 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700">
              <Mail size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted">当前登录邮箱</p>
              <p className="truncate font-medium">{user.email}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/history" className="rounded-3xl bg-brand-50 p-5 transition hover:-translate-y-0.5">
              <History className="text-brand-700" />
              <h2 className="mt-4 font-semibold">历史记录</h2>
              <p className="mt-2 text-sm text-muted">查看命盘、对话与手串记录。</p>
            </Link>
            <Link href="/bracelet" className="rounded-3xl bg-brand-50 p-5 transition hover:-translate-y-0.5">
              <Gem className="text-brand-700" />
              <h2 className="mt-4 font-semibold">手串方案</h2>
              <p className="mt-2 text-sm text-muted">继续编辑当前设计。</p>
            </Link>
            <div className="rounded-3xl bg-brand-50 p-5">
              <Cloud className="text-brand-700" />
              <h2 className="mt-4 font-semibold">跨设备恢复</h2>
              <p className="mt-2 text-sm text-muted">新设备登录后，可从云端恢复本账号数据。</p>
            </div>
            <div className="rounded-3xl bg-brand-50 p-5">
              <ShieldCheck className="text-brand-700" />
              <h2 className="mt-4 font-semibold">账号隔离</h2>
              <p className="mt-2 text-sm text-muted">RLS 限制每位用户只能访问自己的数据。</p>
            </div>
          </div>

          <div className="mt-8">
            <CloudMigrationPanel userId={user.id} />
          </div>
        </section>

        <aside className="card h-fit p-6">
          <Database className="text-brand-700" />
          <h2 className="mt-4 font-semibold">当前完成状态</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            真实登录已经接通。本轮增加命盘、对话与手串的云端迁移和跨设备恢复；首次使用请在左侧完成一次同步。
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </aside>
      </div>
    </div>
  );
}

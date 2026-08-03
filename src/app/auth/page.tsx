import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "登录" };

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = stringParam(params.next) || "/profile";
  const error = stringParam(params.error);
  const mode = stringParam(params.mode) === "signup" ? "signup" : "signin";

  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (data.user) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/profile");

  const message =
    error === "expired"
      ? "登录链接已过期，请重新操作。"
      : error === "callback"
        ? "邮箱确认失败，请重新登录或注册。"
        : "";

  return (
    <div className="shell py-12">
      <AuthForm initialMode={mode} next={next} initialMessage={message} />
    </div>
  );
}

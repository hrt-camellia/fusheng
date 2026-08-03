import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "设置新密码" };

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!data.user) redirect("/auth?error=expired");

  return (
    <div className="shell py-12">
      <UpdatePasswordForm />
    </div>
  );
}

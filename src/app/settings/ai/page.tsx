import { AiSettingsPanel } from "@/components/settings/AiSettingsPanel";

export const metadata = { title: "AI 设置" };

export default function Page() {
  return (
    <main className="shell py-8 sm:py-12">
      <AiSettingsPanel />
    </main>
  );
}

import { ChatPanel } from "@/components/chat/ChatPanel";

export const metadata = { title: "问浮生" };

export default function Page() {
  return (
    <div className="shell py-4 sm:py-5">
      <ChatPanel />
    </div>
  );
}

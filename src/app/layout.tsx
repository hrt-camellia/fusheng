import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { NightSky } from "@/components/theme/NightSky";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: { default: "浮生｜AI心灵导航", template: "%s｜浮生" },
  description: "以传统文化为灵感的AI命理、情绪陪伴与水晶手串DIY体验。",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#9B8AFB",
  width: "device-width",
  initialScale: 1,
};

const initialThemeScript = `
(() => {
  try {
    const mode = localStorage.getItem('fusheng:theme-mode:v1') || 'auto';
    const hour = new Date().getHours();
    const isNight = mode === 'night' || (mode === 'auto' && (hour < 6 || hour >= 19));
    document.documentElement.dataset.theme = isNight ? 'night' : 'day';
    document.documentElement.dataset.themeMode = mode;
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <NightSky />
          <div className="app-layer relative z-10 min-h-screen">
            <AppHeader />
            <main className="min-h-[calc(100vh-72px)] pb-24 md:pb-10">{children}</main>
            <MobileNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

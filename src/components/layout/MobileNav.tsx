"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gem,
  Home,
  MessageCircleHeart,
  Sparkles,
  UserRound,
} from "lucide-react";

const items = [
  ["首页", "/", Home],
  ["问浮生", "/chat", MessageCircleHeart],
  ["运势", "/fortune", Sparkles],
  ["手串", "/bracelet", Gem],
  ["我的", "/profile", UserRound],
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-100 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] ${
                active ? "bg-brand-50 text-brand-700" : "text-muted"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

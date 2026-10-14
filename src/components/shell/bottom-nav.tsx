"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircleQuestion, FolderOpen, ListChecks, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLabels {
  home: string;
  tutor: string;
  courses: string;
  quiz: string;
  profile: string;
}

const items = [
  { key: "home", href: "/accueil", Icon: Home },
  { key: "tutor", href: "/tuteur", Icon: MessageCircleQuestion },
  { key: "courses", href: "/cours", Icon: FolderOpen },
  { key: "quiz", href: "/quiz", Icon: ListChecks },
  { key: "profile", href: "/profil", Icon: UserRound },
] as const;

export function BottomNav({ labels }: { labels: NavLabels }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1 pt-1.5">
        {items.map(({ key, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-medium transition-colors",
                  active ? "text-green" : "text-muted hover:text-ink",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-green-soft")}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={cn(active && "font-bold")}>{labels[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

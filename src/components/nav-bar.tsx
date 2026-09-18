"use client";

import { useTranslations } from "next-intl";
import { Vote, Lightbulb, ListChecks, Archive, ShieldCheck } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/", key: "vote" as const, Icon: Vote },
  { href: "/submit", key: "submit" as const, Icon: Lightbulb },
  { href: "/mine", key: "mine" as const, Icon: ListChecks },
  { href: "/history", key: "history" as const, Icon: Archive },
  { href: "/admin", key: "admin" as const, Icon: ShieldCheck },
];

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-10 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <ul className="max-w-xl mx-auto grid grid-cols-5">
          {items.map(({ href, key, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-0.5 text-[10px] leading-tight text-center font-medium ${
                    active
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
    </nav>
  );
}

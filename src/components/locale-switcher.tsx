"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  bn: "বাংলা",
  ta: "தமிழ்",
  hi: "हिन्दी",
  ur: "اردو",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function select(l: string) {
    setOpen(false);
    router.replace(pathname, { locale: l });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm border border-neutral-300 rounded-md px-2.5 py-1.5 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      >
        <Globe size={15} className="text-neutral-400" />
        {labels[locale]}
        <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1.5 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg z-20 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {routing.locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => select(l)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
                    l === locale
                      ? "text-emerald-700 font-medium bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {labels[l]}
                  {l === locale && <Check size={15} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

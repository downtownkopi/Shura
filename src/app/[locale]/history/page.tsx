"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Archive, Lightbulb } from "lucide-react";

type HistoryIdea = {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  votingDeadline: string;
  voteCount: number;
};

export default function HistoryPage() {
  const t = useTranslations("history");
  const locale = useLocale();
  const [ideas, setIdeas] = useState<HistoryIdea[] | null>(null);

  useEffect(() => {
    fetch(`/api/ideas/history?locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then(setIdeas);
  }, [locale]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold mb-6">
        <Archive size={20} className="text-neutral-500 dark:text-neutral-400" />
        {t("title")}
      </h1>

      {ideas?.length === 0 && <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t("empty")}</p>}

      <ul className="space-y-3">
        {ideas?.map((idea) => (
          <motion.li
            key={idea.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 p-4"
          >
            {idea.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={idea.photoUrl}
                alt=""
                className="w-full h-auto rounded-md mb-3 grayscale-[30%]"
              />
            )}
            <div className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" size={20} />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-neutral-700 dark:text-neutral-300">{idea.title}</h3>
                {idea.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{idea.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold text-neutral-600 dark:text-neutral-300 leading-none">{idea.voteCount}</div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
              {t("closedOn", { date: formatDate(idea.votingDeadline) })}
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

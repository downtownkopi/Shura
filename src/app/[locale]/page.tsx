"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Lightbulb, CheckCircle2, XCircle, ChevronUp, ChevronDown, Clock, User } from "lucide-react";
import { getDeviceId } from "@/lib/device-id";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  submitterName: string | null;
  votingDeadline: string | null;
  voteCount: number;
  myVote: number; // -1, 0, or 1
};

const VOTE_DEBOUNCE_MS = 500;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type VoteT = ReturnType<typeof useTranslations<"vote">>;

// Plain function, not a hook — called per idea inside .map(), so it can't use hooks itself.
function formatCountdown(deadline: string | null, t: VoteT) {
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return null;

  const days = Math.floor(remaining / MS_PER_DAY);
  const hours = Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((remaining % MS_PER_HOUR) / MS_PER_MINUTE);

  // Show the two most significant non-zero units, e.g. "1d 3h" or "3h 20m" or "20m".
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (parts.length < 2 && minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.max(1, Math.floor(remaining / 1000 / 60))}m`);

  return t("timeLeft", { time: parts.slice(0, 2).join(" ") });
}

export default function VotePage() {
  const t = useTranslations("vote");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const deviceIdRef = useRef("");
  const [burst, setBurst] = useState<{ ideaId: string; direction: 1 | -1 } | null>(null);

  // Forces a re-render once a minute so countdown text stays fresh on a long-open tab.
  const [, setClock] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClock((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Server-confirmed state per idea, used to roll back if a debounced sync ever fails.
  const confirmedRef = useRef<Record<string, { voteCount: number; myVote: number }>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const ideasRef = useRef<Idea[] | null>(null);
  useEffect(() => {
    ideasRef.current = ideas;
  }, [ideas]);

  useEffect(() => {
    const id = getDeviceId();
    deviceIdRef.current = id;
    fetch(`/api/ideas?deviceId=${encodeURIComponent(id)}&locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then((data: Idea[]) => {
        setIdeas(data);
        for (const idea of data) {
          confirmedRef.current[idea.id] = { voteCount: idea.voteCount, myVote: idea.myVote };
        }
      });
  }, [locale]);

  function castVote(ideaId: string, direction: 1 | -1) {
    const deviceId = deviceIdRef.current;
    const idea = ideasRef.current?.find((i) => i.id === ideaId);
    if (!deviceId || !idea) return;

    // Clicking the arrow you're already on is idempotent (stays put, even if mashed).
    // Clicking the other arrow walks it back to neutral first, not straight to the opposite vote.
    const nextMyVote = idea.myVote === direction ? direction : idea.myVote === 0 ? direction : 0;

    // Optimistic, instant, and click-repeatable — the network sync is debounced below.
    setIdeas((prev) =>
      prev
        ? prev.map((i) =>
            i.id === ideaId
              ? { ...i, voteCount: i.voteCount + (nextMyVote - i.myVote), myVote: nextMyVote }
              : i,
          )
        : prev,
    );

    if ((nextMyVote === 1 || nextMyVote === -1) && idea.myVote !== nextMyVote) {
      // Fire the burst immediately on click, not after the network round-trip.
      setBurst({ ideaId, direction: nextMyVote });
      setTimeout(() => setBurst((cur) => (cur?.ideaId === ideaId ? null : cur)), 450);
    }

    clearTimeout(debounceTimers.current[ideaId]);
    debounceTimers.current[ideaId] = setTimeout(async () => {
      const latest = ideasRef.current?.find((i) => i.id === ideaId);
      if (!latest) return;

      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, deviceId, value: latest.myVote }),
      });

      if (res.ok) {
        confirmedRef.current[ideaId] = { voteCount: latest.voteCount, myVote: latest.myVote };
      } else {
        // Sync failed — snap back to the last state the server actually confirmed.
        const confirmed = confirmedRef.current[ideaId];
        if (confirmed) {
          setIdeas((prev) => prev?.map((i) => (i.id === ideaId ? { ...i, ...confirmed } : i)) ?? prev);
        }
      }
    }, VOTE_DEBOUNCE_MS);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{tApp("name")}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">{tApp("tagline")}</p>
      <h2 className="text-lg font-medium mb-4">{t("title")}</h2>

      {ideas === null && <p className="text-neutral-500 dark:text-neutral-400 text-sm">…</p>}
      {ideas?.length === 0 && (
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t("empty")}</p>
      )}

      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {ideas?.map((idea) => (
            <motion.li
              key={idea.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4"
            >
              {idea.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={idea.photoUrl}
                  alt=""
                  className="w-full h-auto rounded-md mb-3"
                />
              )}
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 shrink-0 text-amber-500" size={20} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{idea.title}</h3>
                  {idea.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{idea.description}</p>
                  )}
                  {idea.submitterName && (
                    <p className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
                      <User size={12} />
                      {t("postedBy", { name: idea.submitterName })}
                    </p>
                  )}
                  {formatCountdown(idea.votingDeadline, t) && (
                    <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                      <Clock size={12} />
                      {formatCountdown(idea.votingDeadline, t)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-center">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => castVote(idea.id, 1)}
                    aria-label={t("voteButton")}
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${
                      idea.myVote === 1
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-neutral-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30"
                    }`}
                  >
                    <ChevronUp size={22} strokeWidth={idea.myVote === 1 ? 3 : 2} />
                  </motion.button>
                  <motion.span
                    key={idea.voteCount}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className={`text-lg font-bold leading-none ${
                      idea.myVote === 1
                        ? "text-emerald-700 dark:text-emerald-400"
                        : idea.myVote === -1
                          ? "text-red-600 dark:text-red-400"
                          : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {idea.voteCount}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => castVote(idea.id, -1)}
                    aria-label={t("downvoteButton")}
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${
                      idea.myVote === -1
                        ? "text-red-600 dark:text-red-400"
                        : "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:text-neutral-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                    }`}
                  >
                    <ChevronDown size={22} strokeWidth={idea.myVote === -1 ? 3 : 2} />
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {burst?.ideaId === idea.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.6, transition: { duration: 0.18 } }}
                    exit={{ opacity: 0, scale: 2, transition: { duration: 0.25 } }}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-neutral-900/70"
                  >
                    {burst.direction === 1 ? (
                      <CheckCircle2 className="text-emerald-600" size={56} strokeWidth={1.5} />
                    ) : (
                      <XCircle className="text-red-600" size={56} strokeWidth={1.5} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

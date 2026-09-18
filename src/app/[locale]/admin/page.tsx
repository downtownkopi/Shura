"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import {
  KeyRound,
  Inbox,
  Megaphone,
  Check,
  X,
  LogOut,
  User,
  MessageSquareText,
  CalendarClock,
} from "lucide-react";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  submitterName: string | null;
  votingDeadline: string | null;
};

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function formatDeadline(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(defaultDeadline());

  function load() {
    fetch("/api/admin/ideas").then((res) => {
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      res.json().then(setIdeas);
    });
  }

  useEffect(load, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      load();
    } else {
      setLoginError(true);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setIdeas(null);
  }

  async function setStatus(
    id: string,
    status: "approved" | "rejected",
    extra?: { comment?: string; deadline?: string },
  ) {
    setIdeas((prev) => prev?.map((i) => (i.id === id ? { ...i, status } : i)) ?? prev);
    await fetch(`/api/admin/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    load();
  }

  function confirmReject(id: string) {
    setStatus(id, "rejected", { comment: rejectComment });
    setRejectingId(null);
    setRejectComment("");
  }

  function confirmApprove(id: string) {
    if (!deadline) return;
    setStatus(id, "approved", { deadline: new Date(`${deadline}T23:59:59`).toISOString() });
    setApprovingId(null);
    setDeadline(defaultDeadline());
  }

  if (authed === null) return null;

  if (!authed) {
    return (
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <KeyRound className="text-emerald-600 dark:text-emerald-400" size={26} />
        </div>
        <h1 className="text-xl font-semibold mb-6 text-center">{t("loginTitle")}</h1>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("passwordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {loginError && <p className="text-sm text-red-600 dark:text-red-400">{t("loginError")}</p>}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full rounded-md bg-emerald-600 text-white font-medium py-2.5"
          >
            {t("loginButton")}
          </motion.button>
        </form>
      </div>
    );
  }

  const pending = ideas?.filter((i) => i.status === "pending") ?? [];
  const live = ideas?.filter((i) => i.status === "approved") ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <LogOut size={14} />
          {t("logout")}
        </button>
      </div>

      <h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
        <Inbox size={15} />
        {t("pendingIdeas")}
      </h2>
      {pending.length === 0 && <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">{t("empty")}</p>}
      <ul className="space-y-3 mb-8">
        <AnimatePresence initial={false}>
          {pending.map((idea) => (
            <motion.li
              key={idea.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
              className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4"
            >
              {idea.photoUrl && (
                <Image
                  src={idea.photoUrl}
                  alt=""
                  width={400}
                  height={200}
                  className="w-full h-40 object-cover rounded-md mb-3"
                />
              )}
              <h3 className="font-medium">{idea.title}</h3>
              {idea.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{idea.description}</p>
              )}
              <p className="flex items-center gap-1 text-xs text-neutral-400 mt-2">
                <User size={12} />
                {idea.submitterName ? t("submittedBy", { name: idea.submitterName }) : t("submittedAnon")}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                {rejectingId === idea.id ? (
                  <motion.div
                    key="reject-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      <MessageSquareText size={13} />
                      {t("rejectCommentLabel")}
                    </label>
                    <textarea
                      autoFocus
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      placeholder={t("rejectCommentPlaceholder")}
                      maxLength={1000}
                      rows={2}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => confirmReject(idea.id)}
                        className="flex items-center gap-1.5 rounded-md bg-red-600 text-white text-sm font-medium px-3 py-1.5"
                      >
                        <X size={15} />
                        {t("confirmReject")}
                      </motion.button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectComment("");
                        }}
                        className="rounded-md bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 text-sm font-medium px-3 py-1.5"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </motion.div>
                ) : approvingId === idea.id ? (
                  <motion.div
                    key="approve-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      <CalendarClock size={13} />
                      {t("deadlineLabel")}
                    </label>
                    <input
                      autoFocus
                      type="date"
                      value={deadline}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => confirmApprove(idea.id)}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium px-3 py-1.5"
                      >
                        <Check size={15} />
                        {t("confirmApprove")}
                      </motion.button>
                      <button
                        onClick={() => setApprovingId(null)}
                        className="rounded-md bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 text-sm font-medium px-3 py-1.5"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="actions" className="flex gap-2 mt-3">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setApprovingId(idea.id)}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium px-3 py-1.5"
                    >
                      <Check size={15} />
                      {t("approve")}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setRejectingId(idea.id)}
                      className="flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 text-sm font-medium px-3 py-1.5"
                    >
                      <X size={15} />
                      {t("reject")}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
        <Megaphone size={15} />
        {t("liveIdeas")}
      </h2>
      <ul className="space-y-3">
        {live.map((idea) => (
          <li key={idea.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
            {idea.photoUrl && (
              <Image
                src={idea.photoUrl}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 object-cover rounded-md shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">{idea.title}</h3>
              {idea.votingDeadline && (
                <p className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                  <CalendarClock size={12} />
                  {t("closesOn", { date: formatDeadline(idea.votingDeadline, locale) })}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

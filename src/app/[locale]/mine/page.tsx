"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Clock, CheckCircle2, XCircle, Pencil, Trash2, Save, X, MessageSquareText } from "lucide-react";
import { getDeviceId } from "@/lib/device-id";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  committeeComment: string | null;
};

export default function MinePage() {
  const t = useTranslations("mine");
  const locale = useLocale();
  const deviceIdRef = useRef("");
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  function load(id: string) {
    fetch(`/api/ideas/mine?deviceId=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then(setIdeas);
  }

  useEffect(() => {
    const id = getDeviceId();
    deviceIdRef.current = id;
    load(id);
  }, []);

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditDescription(idea.description ?? "");
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const deviceId = deviceIdRef.current;
    const res = await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription, deviceId, locale }),
    });
    if (res.ok) {
      setEditingId(null);
      load(deviceId);
    }
  }

  async function deleteIdea(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const deviceId = deviceIdRef.current;
    const res = await fetch(`/api/ideas/${id}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
    if (res.ok) load(deviceId);
  }

  const statusLabel = (status: Idea["status"]) =>
    status === "approved" ? t("statusApproved") : status === "rejected" ? t("statusRejected") : t("statusPending");

  const statusIcon = (status: Idea["status"]) => {
    if (status === "approved") return <CheckCircle2 size={14} />;
    if (status === "rejected") return <XCircle size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{t("title")}</h1>

      {ideas?.length === 0 && <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t("empty")}</p>}

      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {ideas?.map((idea) => (
            <motion.li
              key={idea.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4"
            >
              {editingId === idea.id ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(idea.id)}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium px-3 py-1.5"
                    >
                      <Save size={15} />
                      {t("save")}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 text-sm font-medium px-3 py-1.5"
                    >
                      <X size={15} />
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 ${
                        idea.status === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : idea.status === "rejected"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {statusIcon(idea.status)}
                      {statusLabel(idea.status)}
                    </span>
                    {idea.status === "pending" && (
                      <div className="flex gap-3 text-sm">
                        <button
                          onClick={() => startEdit(idea)}
                          className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium"
                        >
                          <Pencil size={14} />
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => deleteIdea(idea.id)}
                          className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"
                        >
                          <Trash2 size={14} />
                          {t("delete")}
                        </button>
                      </div>
                    )}
                  </div>
                  {idea.status === "rejected" && idea.committeeComment && (
                    <div className="flex items-start gap-1.5 mt-3 rounded-md bg-neutral-50 dark:bg-neutral-800 p-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <MessageSquareText size={15} className="mt-0.5 shrink-0 text-neutral-400" />
                      <div>
                        <p className="text-xs font-medium text-neutral-400 mb-0.5">
                          {t("committeeComment")}
                        </p>
                        {idea.committeeComment}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

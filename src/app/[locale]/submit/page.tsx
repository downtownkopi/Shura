"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { upload } from "@vercel/blob/client";
import {
  PartyPopper,
  Lightbulb,
  MessageSquareText,
  User,
  Send,
  Loader2,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { getDeviceId } from "@/lib/device-id";

export default function SubmitPage() {
  const t = useTranslations("submit");
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl(null);
    setUploadingPhoto(true);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setPhotoUrl(blob.url);
    } catch {
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoUrl(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting || uploadingPhoto) return;
    setSubmitting(true);

    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        submitterName: name,
        deviceId: getDeviceId(),
        locale,
        photoUrl,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setTitle("");
      setDescription("");
      setName("");
      setPhotoPreview(null);
      setPhotoUrl(null);
    }
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800/40"
            >
              <PartyPopper className="text-emerald-600 dark:text-emerald-400" size={28} />
            </motion.div>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{t("success")}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">{t("successDetail")}</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h1 className="text-xl font-semibold mb-1">{t("title")}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">{t("description")}</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <Lightbulb size={16} className="text-amber-500" />
                  {t("titleLabel")}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  required
                  maxLength={200}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <MessageSquareText size={16} className="text-neutral-400" />
                  {t("detailsLabel")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("detailsPlaceholder")}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <Camera size={16} className="text-neutral-400" />
                  {t("photoLabel")}
                </label>
                {photoPreview ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt=""
                      className="w-full h-auto rounded-md border border-neutral-300 dark:border-neutral-700"
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
                        <Loader2 size={22} className="animate-spin text-white" />
                      </div>
                    )}
                    {!uploadingPhoto && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        aria-label={t("photoRemove")}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-white"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[98px] rounded-md border border-dashed border-neutral-300 dark:border-neutral-700">
                    <label className="flex h-full w-full items-center justify-center text-neutral-400 dark:text-neutral-500 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onPhotoSelected}
                        style={{ display: "none" }}
                      />
                      <ImageIcon size={28} />
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <User size={16} className="text-neutral-400" />
                  {t("nameLabel")}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  maxLength={100}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting || uploadingPhoto}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-600 text-white font-medium py-2.5 disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {t("submitButton")}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

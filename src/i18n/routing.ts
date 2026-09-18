import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ms", "bn", "ta", "hi", "ur"],
  defaultLocale: "en",
});

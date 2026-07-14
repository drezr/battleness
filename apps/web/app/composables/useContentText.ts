import { locales as contentLocales } from "@battleness/content";

export function useContentText() {
  const { locale } = useI18n();

  return (contentKey: string, fallback: string): string => {
    const messages: Record<string, string> =
      locale.value === "fr" ? contentLocales.fr : contentLocales.en;
    return messages[contentKey] ?? fallback;
  };
}

export default defineNuxtConfig({
  compatibilityDate: "2026-07-10",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  modules: ["@nuxtjs/i18n"],
  srcDir: "app",
  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English", language: "en-US", file: "en.json" },
      { code: "fr", name: "Français", language: "fr-BE", file: "fr.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "battleness_locale",
      fallbackLocale: "en",
    },
  },
  nitro: {
    experimental: {
      openAPI: false,
      websocket: true,
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});

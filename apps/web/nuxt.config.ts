export default defineNuxtConfig({
  compatibilityDate: "2026-07-10",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  modules: [],
  srcDir: "app",
  nitro: {
    experimental: {
      openAPI: false,
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});

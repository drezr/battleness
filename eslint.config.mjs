import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.nuxt/**", "**/.output/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "apps/web/server/api/*.test.ts",
            "apps/web/server/utils/*.test.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);

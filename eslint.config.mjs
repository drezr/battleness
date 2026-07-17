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
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 16,
          allowDefaultProject: [
            "apps/web/server/api/*.test.ts",
            "apps/web/server/plugins/*.ts",
            "apps/web/server/utils/*.test.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);

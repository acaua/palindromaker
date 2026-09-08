import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import react from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".wrangler"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs["recommended-typescript"],
  reactHooks.configs.flat["recommended-latest"],
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
);

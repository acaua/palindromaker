import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
);

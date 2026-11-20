import globals from "globals";
import tseslint from "typescript-eslint";
export default [
  {
    files: ["**/*.{js,tsx,ts}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    rules: { "no-undef": "off" },
  },
];

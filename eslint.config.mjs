import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  js.configs.recommended,
  {
    ignores: ["dist/", "node_modules/", "eslint.config.mjs", ".eslintrc.js"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly",
        it: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
      },
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      prettier: prettier,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
    },
  },
];

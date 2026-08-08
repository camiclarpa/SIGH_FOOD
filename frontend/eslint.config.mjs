import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next, con `**/` para alcanzar también
    // los artefactos de los workspaces (p. ej. apps/web/.next).
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Artefactos de build/despliegue: código generado, no fuente.
    "**/.open-next/**",
    "**/.wrangler/**",
    "**/.tools/**",
    "**/lighthouse-reports/**",
  ]),
  {
    rules: {
      // Un guion bajo delante marca "sin usar a propósito": parámetros que
      // existen para cumplir una firma, capturas que no se inspeccionan, etc.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // `const { campo, ...resto } = obj` es la forma idiomática de omitir
          // una clave; el nombre extraído no tiene por qué usarse.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;

import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "artifacts/**",
      "cache/**",
      "contracts/test/**",
      "data/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**"
    ]
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;
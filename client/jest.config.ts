import type { Config } from "jest";

const swcTransform: [string, unknown] = [
  "@swc/jest",
  {
    jsc: {
      parser: { syntax: "typescript", tsx: true },
      transform: {
        react: { runtime: "automatic", importSource: "@emotion/react" },
        optimizer: {
          globals: {
            vars: {
              "import.meta.env.VITE_API_BASE_URL": '"http://localhost:8080"',
            },
          },
        },
      },
    },
  },
];

const config: Config = {
  testEnvironment: "<rootDir>/jest.env.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": swcTransform,
    "^.+\\.mjs$": swcTransform,
  },
  // MSW and its deps are ESM-only — transform them instead of excluding
  transformIgnorePatterns: [
    "/node_modules/(?!(msw|@mswjs|@open-draft|until-async|rettime|outvariant|strict-event-emitter|headers-polyfill|set-cookie-parser)/)",
  ],
};

export default config;

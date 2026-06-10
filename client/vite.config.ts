import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// dev 서버는 반드시 3000 — 서버 CORS가 http://localhost:3000 만 허용
// plugin-react v6는 oxc 기반이라 React Compiler는 babel 프리셋으로 별도 연결
export default defineConfig({
  // GitHub Pages는 /<레포명>/ 하위 경로 — 배포 시 VITE_BASE_PATH 주입. 그 외(로컬/railway)는 "/"
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [
    react({ jsxImportSource: "@emotion/react" }),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: { port: 3000 },
});

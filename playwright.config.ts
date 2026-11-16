import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5197",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --port 5197 --strictPort",
    url: "http://127.0.0.1:5197",
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: "/api" },
  },
  reporter: "list",
});

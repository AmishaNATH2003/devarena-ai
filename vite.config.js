import { defineConfig } from "vite";
import process from "node:process";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Only Playwright's isolated server uses the fake Supabase client.
const isE2E = process.env.DEVARENA_E2E === "1";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  ...(isE2E
    ? {
        resolve: {
          alias: [{
            find: "@supabase/supabase-js",
            replacement: fileURLToPath(
              new URL("./tests/mocks/supabaseClient.mjs", import.meta.url)
            ),
          }],
        },
      }
    : {}),
});

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function assertSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];
  if (!url || String(url).trim() === "") missing.push("VITE_SUPABASE_URL");
  if (!key || String(key).trim() === "") missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required environment variable(s): ${missing.join(", ")}. ` +
        `The Vite dev server must be restarted after Lovable Cloud injects backend keys into .env ` +
        `so they are inlined into the client bundle.`,
    );
  }
}

if (typeof window !== "undefined") {
  assertSupabaseEnv();
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

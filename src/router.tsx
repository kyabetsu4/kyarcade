import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// In the packaged Electron app the page is loaded from disk over file://, which
// has no path-based routing. Detect Electron via the preload-injected bridge and
// use hash history there; the web build keeps path routing under BASE_URL.
const isElectron = typeof window !== "undefined" && "arcade" in window;

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    ...(isElectron ? { history: createHashHistory() } : { basepath: import.meta.env.BASE_URL }),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

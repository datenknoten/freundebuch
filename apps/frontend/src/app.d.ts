import type { ServerConfig } from '$lib/server/config.js';

declare global {
  // Injected by Vite at build time
  const __APP_VERSION__: string;

  namespace App {
    interface Locals {
      config: ServerConfig;
    }
  }
}

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  // Injected by Vite at build time
  const __APP_VERSION__: string;

  namespace App {
    // interface Error {}
    interface Locals {
      sessionToken: string | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};

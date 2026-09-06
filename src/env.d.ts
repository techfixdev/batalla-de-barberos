/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ADMIN_SESSION_SECRET_B64?: string;
}

declare namespace App {
  interface Locals {
    adminSession?: Readonly<{ id: string; expiresAt: string }>;
    adminCsrfToken?: string;
  }
}

import { getRequest } from "@tanstack/react-start/server";
import type { CatalogMode } from "@/content/moves/catalog";

/**
 * Editorial preview is enabled only on unpublished preview hosts (and local dev).
 * The published site and custom domains always run in production mode, where only
 * `published` Moves are visible or recommendable.
 */
export function catalogMode(): CatalogMode {
  try {
    const host = new URL(getRequest().url).hostname;
    if (host === "localhost" || host === "127.0.0.1") return "editorial_preview";
    if (host.startsWith("id-preview--") || host.endsWith("-dev.lovable.app")) return "editorial_preview";
  } catch {
    /* no request context: fail closed */
  }
  return "production";
}

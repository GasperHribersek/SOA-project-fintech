/**
 * Error handling utilities with toast notifications
 */

import { toast } from "sonner";
import { ApiException } from "./api";

/**
 * Handle API errors and show toast notifications
 */
export function handleApiError(error: unknown): void {
  if (error instanceof ApiException) {
    // Handle specific error cases
    if (error.status === 401) {
      toast.error("Seja je potekla", {
        description: error.details || "Prosimo, prijavite se znova.",
        duration: 5000,
      });
    } else if (error.status === 403) {
      toast.error("Dostop zavrnjen", {
        description: error.details || "Nimate dovoljenja za to dejanje.",
      });
    } else if (error.status === 404) {
      toast.error("Ni najdeno", {
        description: error.details || "Zahtevani vir ni bil najden.",
      });
    } else if (error.status >= 500) {
      toast.error("Napaka strežnika", {
        description:
          error.details ||
          "Prišlo je do napake na strežniku. Poskusite znova pozneje.",
      });
    } else {
      toast.error(error.message || "Napaka", {
        description: error.details,
      });
    }
  } else if (error instanceof Error) {
    toast.error("Napaka", {
      description: error.message,
    });
  } else {
    toast.error("Neznana napaka", {
      description: "Prišlo je do nepričakovane napake.",
    });
  }
}

/**
 * Wrap an async function to automatically handle errors with toast notifications
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error);
      throw error; // Re-throw so caller can handle if needed
    }
  }) as T;
}

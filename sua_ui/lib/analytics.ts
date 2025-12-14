import { analyticsApi, ApiException } from "./api";
import { getUser, isAuthenticated } from "./auth";

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

export async function trackEvent(
  eventType: string,
  data: {
    userId?: number;
    pagePath?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    // Check if user is authenticated before tracking
    // Analytics requires JWT token, so skip if not authenticated
    if (!isAuthenticated()) {
      // Silently skip tracking if user is not authenticated
      return;
    }

    // Get user ID from stored user data if not provided
    const user = getUser();
    const userId = data.userId || user?.id;

    await analyticsApi.trackEvent({
      event_type: eventType,
      user_id: userId,
      session_id: getSessionId(),
      page_path:
        data.pagePath ||
        (typeof window !== "undefined" ? window.location.pathname : ""),
      metadata: data.metadata || {},
    });
  } catch (error) {
    // Log error but don't throw - analytics failures shouldn't break the app
    // Only log if it's not an authentication error (401)
    if (error instanceof ApiException) {
      if (error.status !== 401) {
        console.error("Failed to track event:", error.message, error.details);
      }
      // Silently ignore 401 errors for analytics - user might not be logged in
    } else {
      console.error("Error tracking event:", error);
    }
  }
}

export function trackPageView(pagePath: string, userId?: number): void {
  trackEvent("page_view", {
    userId,
    pagePath,
    metadata: {
      referrer: typeof window !== "undefined" ? document.referrer : "",
    },
  });
}

export function trackButtonClick(
  buttonId: string,
  buttonText: string,
  location: string,
  userId?: number
): void {
  trackEvent("button_click", {
    userId,
    metadata: {
      button_id: buttonId,
      button_text: buttonText,
      location,
    },
  });
}

export function trackPaymentInitiated(
  amount: number,
  currency: string = "EUR",
  userId?: number
): void {
  trackEvent("payment_initiated", {
    userId,
    metadata: {
      amount,
      currency,
      payment_method: "card",
    },
  });
}

export function trackPaymentCompleted(
  amount: number,
  transactionId: string,
  currency: string = "EUR",
  userId?: number
): void {
  trackEvent("payment_completed", {
    userId,
    metadata: {
      amount,
      currency,
      transaction_id: transactionId,
      payment_method: "card",
    },
  });
}

/**
 * Track payment failed
 */
export function trackPaymentFailed(
  amount: number,
  reason: string,
  currency: string = "EUR",
  userId?: number
): void {
  trackEvent("payment_failed", {
    userId,
    metadata: {
      amount,
      currency,
      reason,
    },
  });
}

/**
 * Track chart interaction
 */
export function trackChartInteraction(
  chartType: string,
  action: string,
  userId?: number
): void {
  trackEvent("chart_interaction", {
    userId,
    metadata: {
      chart_type: chartType,
      action,
    },
  });
}

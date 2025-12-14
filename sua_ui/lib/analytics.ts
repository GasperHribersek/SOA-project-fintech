const ANALYTICS_API_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost:5001";

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
    const response = await fetch(`${ANALYTICS_API_URL}/api/analytics/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: eventType,
        user_id: data.userId,
        session_id: getSessionId(),
        page_path:
          data.pagePath ||
          (typeof window !== "undefined" ? window.location.pathname : ""),
        metadata: data.metadata || {},
      }),
    });

    if (!response.ok) {
      console.error("Failed to track event:", await response.text());
    }
  } catch (error) {
    console.error("Error tracking event:", error);
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

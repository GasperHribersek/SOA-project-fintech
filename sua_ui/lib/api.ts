/**
 * API client with JWT token support and error handling
 */

import { getToken, removeToken, isTokenExpired } from "./auth";
import { toast } from "sonner";

const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:3001";
const USER_SERVICE_URL =
  process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:3002";
const ANALYTICS_SERVICE_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost:5001";

export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Custom error class for API errors
 */
export class ApiException extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: string
  ) {
    super(message);
    this.name = "ApiException";
  }
}

/**
 * Make an API request with automatic JWT token handling
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  // Check if token is expired
  if (token && isTokenExpired(token)) {
    removeToken();
    throw new ApiException(
      401,
      "Token expired",
      "Your session has expired. Please login again."
    );
  }

  // Prepare headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    // Log warning if token is missing for protected endpoints
    if (url.includes("/api/analytics") || url.includes("/api/users")) {
      console.warn("No token available for protected endpoint:", url);
    }
  }

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  // Handle errors
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: string | undefined;

    if (isJson) {
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details;
      } catch {
        // If JSON parsing fails, use default message
      }
    } else {
      try {
        errorDetails = await response.text();
      } catch {
        // If text parsing fails, ignore
      }
    }

    // Handle specific error cases
    if (response.status === 401) {
      // Token is invalid or expired
      removeToken();
      const exception = new ApiException(
        401,
        errorMessage || "Unauthorized",
        errorDetails ||
          "Your session has expired or is invalid. Please login again."
      );
      // Show toast notification for token expiration
      if (typeof window !== "undefined") {
        toast.error("Seja je potekla", {
          description: "Vaša seja je potekla. Prosimo, prijavite se znova.",
        });
      }
      throw exception;
    }

    throw new ApiException(response.status, errorMessage, errorDetails);
  }

  // Parse response
  if (isJson) {
    return response.json();
  }

  return response.text() as unknown as T;
}

/**
 * Auth Service API
 */
export const authApi = {
  /**
   * Register a new user
   */
  async register(data: { username: string; email: string; password: string }) {
    return apiRequest<{ message: string; userId: number }>(
      `${AUTH_SERVICE_URL}/api/auth/register`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Login user
   */
  async login(data: { email: string; password: string }) {
    return apiRequest<{
      message: string;
      token: string;
      user: { id: number; username: string; email: string };
    }>(`${AUTH_SERVICE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await apiRequest<{ message: string }>(
        `${AUTH_SERVICE_URL}/api/auth/logout`,
        {
          method: "POST",
        }
      );
    } finally {
      // Always remove token locally, even if API call fails
      removeToken();
    }
  },

  /**
   * Validate token
   */
  async validateToken() {
    return apiRequest<{
      valid: boolean;
      user?: {
        userId: number;
        sub: string;
        name: string;
        email: string;
        username: string;
      };
    }>(`${AUTH_SERVICE_URL}/api/auth/validate-token`, {
      method: "GET",
    });
  },
};

/**
 * User Service API
 */
export const userApi = {
  /**
   * Get user profile
   */
  async getProfile(userId: number) {
    return apiRequest(`${USER_SERVICE_URL}/api/users/${userId}`, {
      method: "GET",
    });
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: any) {
    return apiRequest(`${USER_SERVICE_URL}/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all profiles
   */
  async getAllProfiles() {
    return apiRequest(`${USER_SERVICE_URL}/api/users`, {
      method: "GET",
    });
  },
};

/**
 * Analytics Service API
 */
export const analyticsApi = {
  /**
   * Track an event
   */
  async trackEvent(data: {
    event_type: string;
    user_id?: number;
    session_id?: string;
    page_path?: string;
    metadata?: Record<string, unknown>;
  }) {
    return apiRequest<{
      success: boolean;
      event_id: number;
      timestamp: string;
    }>(`${ANALYTICS_SERVICE_URL}/api/analytics/event`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get analytics events
   */
  async getEvents(params?: {
    user_id?: number;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const url = `${ANALYTICS_SERVICE_URL}/api/analytics/events${
      queryString ? `?${queryString}` : ""
    }`;
    return apiRequest(url, {
      method: "GET",
    });
  },
};

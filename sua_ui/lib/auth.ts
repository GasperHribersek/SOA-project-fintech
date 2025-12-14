/**
 * Authentication utilities for JWT token management
 */

const TOKEN_KEY = "jwt_token";
const USER_KEY = "user_data";

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
}

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Store user data in localStorage
 */
export function setUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Decode JWT token to get payload (without verification)
 * Note: This is only for reading token data, not for verification
 */
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

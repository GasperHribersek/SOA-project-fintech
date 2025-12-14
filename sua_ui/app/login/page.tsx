"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";
import { ArrowLeft, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setToken(response.token);
      setUser({
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        name: response.user.username,
      });
      toast.success("Uspešno prijavljeni", {
        description: `Dobrodošli, ${response.user.username}!`,
      });
      router.push("/user");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazaj na domačo stran
        </Link>

        {/* Login Card */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold text-card-foreground">
                Prijava
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Vnesite svoje podatke za prijavo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-card-foreground mb-2"
              >
                E-pošta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="uporabnik@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-card-foreground mb-2"
              >
                Geslo
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Prijavljanje..." : "Prijavi se"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Nimate računa?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Registrirajte se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

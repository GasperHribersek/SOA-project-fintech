"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.register({ username, email, password });
      toast.success("Registracija uspešna", {
        description: "Uspešno ste se registrirali. Prosimo, prijavite se.",
      });
      router.push("/login");
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

        {/* Register Card */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold text-card-foreground">
                Registracija
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Ustvarite nov račun
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-card-foreground mb-2"
              >
                Uporabniško ime
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="janeznovak"
                disabled={isLoading}
              />
            </div>

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
                minLength={6}
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
              {isLoading ? "Registriranje..." : "Registriraj se"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Že imate račun?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Prijavite se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

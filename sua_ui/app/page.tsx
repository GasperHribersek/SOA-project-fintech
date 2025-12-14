import Link from "next/link";
import { User, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">SOA Aplikacija</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Prijava
              </Link>
              <Link
                href="/user"
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-4 w-4" />
                Uporabniška predstavitev
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Dobrodošli v SOA aplikaciji
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            Sodobna storitveno usmerjena arhitektura aplikacija, zgrajena z Next.js in React.
            Raziskujte uporabniško predstavitveno stran, da vidite aplikacijo v akciji.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/user"
              className="group flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              Ogled uporabniške predstavitve
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mx-auto mt-24 max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Sodoben dizajn
              </h3>
              <p className="text-sm text-muted-foreground">
                Zgrajeno z najnovejšimi spletnimi tehnologijami in najboljšimi praksami za gladko uporabniško izkušnjo.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Upravljanje uporabnikov
              </h3>
              <p className="text-sm text-muted-foreground">
                Obsežni uporabniški profili in funkcije upravljanja za vaše aplikacijske potrebe.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                Razširljiva arhitektura
              </h3>
              <p className="text-sm text-muted-foreground">
                Storitveno usmerjena arhitektura, ki se prilagaja vašim poslovnim potrebam.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

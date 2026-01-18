"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, Filter, Calendar, RefreshCw } from "lucide-react";
import { isAuthenticated, getUser } from "@/lib/auth";
import { analyticsApi } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

interface AnalyticsEvent {
  id: number;
  event_type: string;
  user_id: number;
  session_id: string;
  page_path: string;
  metadata: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

interface AnalyticsResponse {
  events: AnalyticsEvent[];
  total: number;
  limit: number;
  offset: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string; email: string } | null>(null);
  const [filter, setFilter] = useState({
    event_type: "",
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [filter, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = (await analyticsApi.getEvents({
        user_id: user?.id,
        event_type: filter.event_type || undefined,
        limit: filter.limit,
        offset: filter.offset,
      })) as AnalyticsResponse;

      setEvents(response.events);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch analytics events:", error);
      handleApiError(error, "Napaka pri nalaganju dogodkov");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("sl-SI", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventTypeColor = (eventType: string) => {
    const colorMap: Record<string, string> = {
      page_view: "bg-blue-100 text-blue-800",
      button_click: "bg-green-100 text-green-800",
      payment_initiated: "bg-yellow-100 text-yellow-800",
      payment_completed: "bg-emerald-100 text-emerald-800",
      profile_created: "bg-purple-100 text-purple-800",
      profile_updated: "bg-indigo-100 text-indigo-800",
      balance_viewed: "bg-cyan-100 text-cyan-800",
      investment_simulated: "bg-orange-100 text-orange-800",
    };
    return colorMap[eventType] || "bg-gray-100 text-gray-800";
  };

  const eventTypes = [
    { value: "", label: "Vsi dogodki" },
    { value: "page_view", label: "Ogled strani" },
    { value: "button_click", label: "Klik gumba" },
    { value: "payment_initiated", label: "Plačilo začeto" },
    { value: "payment_completed", label: "Plačilo zaključeno" },
    { value: "profile_created", label: "Profil ustvarjen" },
    { value: "profile_updated", label: "Profil posodobljen" },
    { value: "balance_viewed", label: "Ogled stanja" },
    { value: "investment_simulated", label: "Investicija" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Nazaj na domačo stran</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold text-foreground">
                Moji dogodki
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Analitika dogodkov
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pregled vaših aktivnosti v aplikaciji
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchEvents()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Osveži
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Skupaj dogodkov</p>
                  <p className="text-3xl font-bold text-foreground">{total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prikazanih</p>
                  <p className="text-3xl font-bold text-foreground">
                    {events.length}
                  </p>
                </div>
                <Filter className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uporabnik</p>
                  <p className="text-3xl font-bold text-foreground">
                    {user?.username || user?.email}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Filtri
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Tip dogodka
                </label>
                <select
                  value={filter.event_type}
                  onChange={(e) =>
                    setFilter({ ...filter, event_type: e.target.value, offset: 0 })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Število rezultatov
                </label>
                <select
                  value={filter.limit}
                  onChange={(e) =>
                    setFilter({ ...filter, limit: Number(e.target.value), offset: 0 })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Seznam dogodkov
              </h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ni dogodkov za prikaz
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tip dogodka
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Pot
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Čas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Metadata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                          {event.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getEventTypeColor(
                              event.event_type
                            )}`}
                          >
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {event.page_path}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(event.timestamp)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {Object.keys(event.metadata).length > 0 ? (
                            <details className="cursor-pointer">
                              <summary className="text-primary hover:underline">
                                Prikaži
                              </summary>
                              <pre className="mt-2 max-w-xs overflow-auto rounded bg-muted p-2 text-xs">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
            {total > filter.limit && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <button
                  onClick={() =>
                    setFilter({ ...filter, offset: Math.max(0, filter.offset - filter.limit) })
                  }
                  disabled={filter.offset === 0}
                  className="rounded-lg border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5 disabled:opacity-50"
                >
                  Nazaj
                </button>
                <span className="text-sm text-muted-foreground">
                  Prikazujem {filter.offset + 1} -{" "}
                  {Math.min(filter.offset + filter.limit, total)} od {total}
                </span>
                <button
                  onClick={() =>
                    setFilter({ ...filter, offset: filter.offset + filter.limit })
                  }
                  disabled={filter.offset + filter.limit >= total}
                  className="rounded-lg border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5 disabled:opacity-50"
                >
                  Naprej
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Receipt,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import {
  transactionsApi,
  budgetApi,
  type Transaction,
  type Budget,
} from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

export default function FinancePage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form stanja
  const [limitInput, setLimitInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadAll();
  }, []);

  // Naloži proračune in transakcije; po nalaganju preveri morebitno prekoračitev
  const loadAll = async (warnOnOverflow = false) => {
    try {
      setLoading(true);
      const [b, t] = await Promise.all([budgetApi.list(), transactionsApi.list()]);
      setBudgets(b);
      setTransactions(t);

      if (warnOnOverflow) {
        const overflown = b.filter(
          (x) => parseFloat(x.spent) > parseFloat(x.limitamount)
        );
        if (overflown.length > 0) {
          toast.warning("Proračun presežen!", {
            description: `Poraba presega limit pri ${overflown.length} proračunu(ih).`,
            duration: 6000,
          });
        }
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async () => {
    const limitAmount = parseFloat(limitInput);
    if (isNaN(limitAmount) || limitAmount <= 0) {
      toast.error("Vnesite veljaven limit (> 0)");
      return;
    }
    try {
      setSubmitting(true);
      await budgetApi.create({ limitAmount });
      toast.success("Proračun ustvarjen");
      setLimitInput("");
      await loadAll();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Ustvari transakcijo → transactions-service sam posodobi proračun (medstoritveni klic)
  const createTransaction = async () => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Vnesite veljaven znesek (> 0)");
      return;
    }
    if (!categoryInput.trim()) {
      toast.error("Kategorija je obvezna");
      return;
    }
    try {
      setSubmitting(true);
      await transactionsApi.create({
        amount,
        category: categoryInput.trim(),
        note: noteInput.trim() || undefined,
      });
      toast.success("Transakcija dodana");
      setAmountInput("");
      setCategoryInput("");
      setNoteInput("");
      // Ponovno naloži: poraba proračuna se je posodobila prek druge storitve
      await loadAll(true);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      await transactionsApi.remove(id);
      toast.success("Transakcija izbrisana");
      await loadAll();
    } catch (error) {
      handleApiError(error);
    }
  };

  const deleteBudget = async (id: number) => {
    try {
      await budgetApi.remove(id);
      toast.success("Proračun izbrisan");
      await loadAll();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Za čist demo: izbriši vse
  const resetAll = async () => {
    if (!confirm("Izbrišem vse proračune in transakcije?")) return;
    try {
      await Promise.all([transactionsApi.clearAll(), budgetApi.clearAll()]);
      toast.success("Vse izbrisano");
      await loadAll();
    } catch (error) {
      handleApiError(error);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigacija */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/user"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Nazaj na nadzorno ploščo</span>
            </Link>
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Transakcije in proračun
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Počisti
              </button>
              <button
                onClick={() => loadAll()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Osveži
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== PRORAČUNI ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Proračuni</h2>
          </div>

          {/* Forma za nov proračun */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex gap-3">
              <input
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                placeholder="Limit (€)"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createBudget}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj
              </button>
            </div>
          </div>

          {/* Seznam proračunov */}
          <div className="space-y-3">
            {budgets.length === 0 && !loading && (
              <p className="text-gray-500 text-sm">Ni proračunov.</p>
            )}
            {budgets.map((b) => {
              const limit = parseFloat(b.limitamount);
              const spent = parseFloat(b.spent);
              const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const over = spent > limit;
              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl shadow-lg p-5 border ${
                    over ? "border-red-300" : "border-gray-100"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Proračun #{b.id}</span>
                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span
                      className={`text-2xl font-bold ${
                        over ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {spent.toFixed(2)} €
                    </span>
                    <span className="text-sm text-gray-500">
                      / {limit.toFixed(2)} € limit
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        over ? "bg-red-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {over && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      Proračun presežen za {(spent - limit).toFixed(2)} €
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== TRANSAKCIJE ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Transakcije</h2>
          </div>

          {/* Forma za novo transakcijo */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-3">
            <div className="flex gap-3">
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Znesek (€)"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                placeholder="Kategorija"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Opomba (neobvezno)"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={createTransaction}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Ob dodajanju transactions-service samodejno posodobi porabo v
              budget-service.
            </p>
          </div>

          {/* Seznam transakcij */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 divide-y divide-gray-100">
            {transactions.length === 0 && !loading && (
              <p className="text-gray-500 text-sm p-5">Ni transakcij.</p>
            )}
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{t.category}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(t.createdat)}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">
                    {parseFloat(t.amount).toFixed(2)} €
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SimpleLineChart } from "@/components/ui/chart";
import {
    ArrowLeft,
    CreditCard,
    CheckCircle2,
    TrendingUp,
    BarChart3,
    X,
    ShoppingBag,
    Shirt,
    UtensilsCrossed,
    Home,
    Car,
    Heart,
    Wallet,
    ArrowDownCircle,
    ArrowUpCircle,
    PiggyBank,
    LogOut,
} from "lucide-react";
import {
    trackPageView,
    trackButtonClick,
    trackPaymentInitiated,
    trackPaymentCompleted,
    trackChartInteraction,
    trackEvent,
} from "@/lib/analytics";
import { authApi } from "@/lib/api";
import { removeToken, getUser, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

export default function UserPage() {
    const router = useRouter();
    const [authenticatedUser, setAuthenticatedUser] = useState<{ id: number; username: string; email: string; name?: string } | null>(null);

    // Demo uporabniški podatki (fallback)
    const demoUser = {
        id: 1,
        name: "Janez Novak",
        username: "janeznovak",
        email: "janez.novak@example.com",
        phone: "+386 1 234 5678",
        location: "Ljubljana, Slovenija",
        joinDate: "15. januar 2023",
        company: "Tehnične rešitve d.o.o.",
        role: "Višji programski inženir",
        bio: "Strasten programski inženir s strokovnim znanjem o storitveno usmerjenih arhitekturah in sodobnem spletnem razvoju. Vedno se učim in gradim inovativne rešitve.",
        avatar: "https://placehold.co/200x200/4F46E5/FFFFFF?text=JN",
    };

    // Merge authenticated user with demo user data for display
    const user = authenticatedUser
        ? { ...demoUser, ...authenticatedUser, name: authenticatedUser.name || authenticatedUser.username || authenticatedUser.email }
        : demoUser;

    const stats = [
        { label: "Skupno stanje", value: "12.450,00", suffix: "€", icon: Wallet, color: "text-primary" },
        { label: "Mesečni prihodki", value: "3.200,00", suffix: "€", icon: ArrowDownCircle, color: "text-emerald-500" },
        { label: "Mesečni stroški", value: "1.470,00", suffix: "€", icon: ArrowUpCircle, color: "text-rose-500" },
        { label: "Prihranki", value: "8.750,00", suffix: "€", icon: PiggyBank, color: "text-sky-500" },
    ];

    const quickActions = [
        { id: "send_money", label: "Pošlji", icon: ArrowUpCircle, onClickMode: "pay" as const },
        { id: "request_money", label: "Zahtevaj", icon: ArrowDownCircle, onClickMode: "request" as const },
        { id: "invest", label: "Investiraj", icon: PiggyBank, onClickMode: "invest" as const },
        { id: "cards", label: "Kartice", icon: CreditCard },
    ];

    // Podatki za graf aktivnosti
    const monthlyActivity = [
        { name: "Jan", value: 12 },
        { name: "Feb", value: 15 },
        { name: "Mar", value: 18 },
        { name: "Apr", value: 20 },
        { name: "Maj", value: 22 },
        { name: "Jun", value: 25 },
    ];

    // Podatki za graf stroškov
    const expenseDistribution = [
        { name: "Trgovine", value: 450, color: "oklch(0.646 0.222 41.116)", icon: ShoppingBag },
        { name: "Prehrana", value: 320, color: "oklch(0.6 0.118 184.704)", icon: UtensilsCrossed },
        { name: "Oblačila", value: 180, color: "oklch(0.398 0.07 227.392)", icon: Shirt },
        { name: "Dom", value: 250, color: "oklch(0.828 0.189 84.429)", icon: Home },
        { name: "Transport", value: 150, color: "oklch(0.769 0.188 70.08)", icon: Car },
        { name: "Zdravje", value: 120, color: "oklch(0.577 0.245 27.325)", icon: Heart },
    ];

    type PaymentMode = "pay" | "request" | "invest";

    // Payment & financial actions state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("pay");
    const [paymentAmount, setPaymentAmount] = useState("50.00");
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCVC, setCardCVC] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Request payment state
    const [requestEmail, setRequestEmail] = useState("");
    const [requestDescription, setRequestDescription] = useState("");

    // Invest state
    const [investmentAmount, setInvestmentAmount] = useState("100.00");
    const [investmentType, setInvestmentType] = useState("etf");
    const [investmentHorizon, setInvestmentHorizon] = useState("3");

    // Check authentication and load user data
    useEffect(() => {
        const checkAuth = () => {
            if (isAuthenticated()) {
                const storedUser = getUser();
                if (storedUser) {
                    setAuthenticatedUser(storedUser);
                    trackPageView('/user', storedUser.id);
                } else {
                    trackPageView('/user', demoUser.id);
                }
            } else {
                trackPageView('/user', demoUser.id);
            }
        };
        checkAuth();
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.logout();
            removeToken();
            toast.success("Uspešno odjavljeni");
            router.push("/");
        } catch (error) {
            // Even if API call fails, remove token locally
            removeToken();
            handleApiError(error);
            router.push("/");
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        const amount = parseFloat(paymentAmount);
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Track payment initiated
        trackPaymentInitiated(amount, 'EUR', user.id);

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            // Track payment completed
            trackPaymentCompleted(amount, transactionId, 'EUR', user.id);

            setTimeout(() => {
                setPaymentSuccess(false);
                setCardNumber("");
                setCardName("");
                setCardExpiry("");
                setCardCVC("");
                setIsPaymentModalOpen(false);
            }, 3000);
        }, 2000);
    };

    const handleRequestPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        const amount = parseFloat(paymentAmount);

        trackEvent("payment_request_created", {
            userId: user.id,
            metadata: {
                amount,
                currency: "EUR",
                email: requestEmail,
                description: requestDescription,
            },
        });

        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            setTimeout(() => {
                setPaymentSuccess(false);
                setRequestEmail("");
                setRequestDescription("");
                setIsPaymentModalOpen(false);
            }, 3000);
        }, 1500);
    };

    const handleInvest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        const amount = parseFloat(investmentAmount);

        trackEvent("investment_simulated", {
            userId: user.id,
            metadata: {
                amount,
                currency: "EUR",
                type: investmentType,
                horizon_years: Number(investmentHorizon),
            },
        });

        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            setTimeout(() => {
                setPaymentSuccess(false);
                setIsPaymentModalOpen(false);
            }, 3000);
        }, 1500);
    };

    const openPaymentModal = (mode: PaymentMode) => {
        setPaymentMode(mode);
        setIsPaymentModalOpen(true);
        setPaymentSuccess(false);

        const buttonId =
            mode === "pay"
                ? "payment_button"
                : mode === "request"
                    ? "request_payment_button"
                    : "invest_button";
        const buttonText =
            mode === "pay"
                ? "Odpri plačilo"
                : mode === "request"
                    ? "Zahtevaj plačilo"
                    : "Investiraj";

        trackButtonClick(buttonId, buttonText, "user_profile", user.id);
    };

    const closePaymentModal = () => {
        if (!isProcessing) {
            setIsPaymentModalOpen(false);
            setPaymentSuccess(false);
            setCardNumber("");
            setCardName("");
            setCardExpiry("");
            setCardCVC("");
            setRequestEmail("");
            setRequestDescription("");
        }
    };

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
                            <span className="text-xl font-semibold text-foreground">Uporabniški profil</span>
                            {isAuthenticated() && (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Odjava
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* User Dashboard Section */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    {/* Top row: balance + quick actions (Revolut-like) */}
                    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
                        {/* Main balance card */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-widest opacity-80">
                                        Na voljo
                                    </p>
                                    <p className="mt-2 text-3xl font-semibold sm:text-4xl">
                                        12.450,00 €
                                    </p>
                                    <p className="mt-1 text-xs sm:text-sm opacity-80">
                                        Osebni račun · EUR
                                    </p>
                                </div>
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/30 bg-white/20 flex items-center justify-center text-white font-semibold text-lg sm:text-xl">
                                    {authenticatedUser ? (authenticatedUser.name || authenticatedUser.username || authenticatedUser.email).charAt(0).toUpperCase() : 'JN'}
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => openPaymentModal("pay")}
                                    className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm backdrop-blur hover:bg-white/20"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Plačaj
                                </button>
                                <button
                                    onClick={() => openPaymentModal("request")}
                                    className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm backdrop-blur hover:bg-white/15"
                                >
                                    <ArrowDownCircle className="h-4 w-4" />
                                    Zahtevaj
                                </button>
                                <button
                                    onClick={() => openPaymentModal("invest")}
                                    className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm backdrop-blur hover:bg-white/15"
                                >
                                    <PiggyBank className="h-4 w-4" />
                                    Investiraj
                                </button>
                            </div>
                            <div className="pointer-events-none absolute inset-y-0 right-0 opacity-40">
                                <div className="h-full w-40 bg-gradient-to-t from-white/10 to-transparent blur-3xl" />
                            </div>
                        </div>

                        {/* Quick actions + user meta */}
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Hitre akcije
                                </p>
                                <div className="grid grid-cols-4 gap-3">
                                    {quickActions.map((action) => {
                                        const Icon = action.icon;
                                        const handleClick = () => {
                                            if (action.onClickMode) {
                                                openPaymentModal(action.onClickMode);
                                            }
                                        };
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={handleClick}
                                                className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/40 px-2 py-2 text-xs text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="truncate text-[0.7rem] sm:text-xs">
                                                    {action.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-card-foreground">
                                            {authenticatedUser ? (authenticatedUser.name || authenticatedUser.username || authenticatedUser.email) : user.name}
                                        </p>
                                        <p className="text-xs">
                                            {authenticatedUser ? authenticatedUser.email : `Član od ${user.joinDate}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle row: stats + charts */}
                    <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)]">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {stats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {stat.label}
                                            </span>
                                            <Icon className={`h-4 w-4 ${stat.color}`} />
                                        </div>
                                        <div className="text-lg font-semibold text-card-foreground sm:text-xl">
                                            {stat.value} {stat.suffix}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fintech extra: goals summary */}
                        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="h-5 w-5 text-primary" />
                                    <h2 className="text-sm font-semibold text-card-foreground">
                                        Cilji varčevanja
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    3 aktivni cilji
                                </span>
                            </div>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="font-medium text-card-foreground">
                                            Rezervni sklad
                                        </span>
                                        <span className="text-muted-foreground">3.500 € / 5.000 €</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full w-[70%] rounded-full bg-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="font-medium text-card-foreground">
                                            Potovanje
                                        </span>
                                        <span className="text-muted-foreground">1.200 € / 2.000 €</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full w-[60%] rounded-full bg-sky-500" />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="font-medium text-card-foreground">
                                            Avto
                                        </span>
                                        <span className="text-muted-foreground">4.000 € / 10.000 €</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full w-[40%] rounded-full bg-violet-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="mt-2 grid gap-6 lg:grid-cols-2">
                        {/* Activity Chart */}
                        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-card-foreground">
                                        Mesečna aktivnost
                                    </h2>
                                </div>
                            </div>
                            <div
                                className="mt-2 h-[200px] w-full"
                                onMouseEnter={() => trackChartInteraction("monthly_activity", "hover", user.id)}
                                onClick={() => trackChartInteraction("monthly_activity", "click", user.id)}
                            >
                                <SimpleLineChart data={monthlyActivity} />
                            </div>
                        </div>

                        {/* Expense Distribution Chart */}
                        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold text-card-foreground">
                                    Razdelitev stroškov
                                </h2>
                            </div>
                            <div className="space-y-4">
                                {expenseDistribution.map((expense, index) => {
                                    const total = expenseDistribution.reduce((sum, e) => sum + e.value, 0);
                                    const percentage = (expense.value / total) * 100;
                                    const Icon = expense.icon;
                                    return (
                                        <div
                                            key={index}
                                            onMouseEnter={() => trackChartInteraction('expense_distribution', 'hover', user.id)}
                                            onClick={() => trackChartInteraction('expense_distribution', 'click', user.id)}
                                        >
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium text-card-foreground">
                                                        {expense.name}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {expense.value.toFixed(0)} € ({percentage.toFixed(0)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: expense.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>



                    {/* Payment Demo Section */}
                    <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-card-foreground">
                                Predstavitev plačila
                            </h2>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Izberite eno izmed spodnjih dejanj za predstavitev plačilnega in investicijskega sistema.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => openPaymentModal("pay")}
                                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                            >
                                <CreditCard className="h-4 w-4" />
                                Odpri plačilo
                            </button>
                            <button
                                onClick={() => openPaymentModal("request")}
                                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-6 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5"
                            >
                                <ArrowDownCircle className="h-4 w-4" />
                                Zahtevaj plačilo
                            </button>
                            <button
                                onClick={() => openPaymentModal("invest")}
                                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-6 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5"
                            >
                                <PiggyBank className="h-4 w-4" />
                                Investiraj
                            </button>
                        </div>
                    </div>

                    {/* Payment Modal */}
                    {isPaymentModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                            <div className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-lg">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between border-b border-border p-6">
                                    <h2 className="text-xl font-semibold text-card-foreground">
                                        {paymentMode === "pay"
                                            ? "Plačilo"
                                            : paymentMode === "request"
                                                ? "Zahteva za plačilo"
                                                : "Investicija"}
                                    </h2>
                                    <button
                                        onClick={closePaymentModal}
                                        disabled={isProcessing}
                                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="p-6">
                                    {paymentSuccess ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                                            <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                                                {paymentMode === "pay"
                                                    ? "Plačilo uspešno!"
                                                    : paymentMode === "request"
                                                        ? "Zahteva za plačilo poslana!"
                                                        : "Investicija zabeležena!"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {paymentMode === "pay" &&
                                                    `Vaše plačilo v višini ${paymentAmount} € je bilo uspešno obdelano.`}
                                                {paymentMode === "request" &&
                                                    `Vaša zahteva za plačilo v višini ${paymentAmount} € je bila uspešno poslana na ${requestEmail}.`}
                                                {paymentMode === "invest" &&
                                                    `Vaša simulirana investicija v višini ${investmentAmount} € je bila uspešno zabeležena.`}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {paymentMode === "pay" && (
                                                <form onSubmit={handlePayment} className="space-y-4">
                                                    <div>
                                                        <label
                                                            htmlFor="amount"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Znesek (€)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="amount"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                            step="0.01"
                                                            min="0.01"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="cardName"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Ime na kartici
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="cardName"
                                                            value={cardName}
                                                            onChange={(e) => setCardName(e.target.value)}
                                                            placeholder="Janez Novak"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="cardNumber"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Številka kartice
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="cardNumber"
                                                            value={cardNumber}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
                                                                const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                                                                setCardNumber(formatted.slice(0, 19));
                                                            }}
                                                            placeholder="1234 5678 9012 3456"
                                                            maxLength={19}
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label
                                                                htmlFor="cardExpiry"
                                                                className="mb-2 block text-sm font-medium text-card-foreground"
                                                            >
                                                                Veljavnost (MM/YY)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="cardExpiry"
                                                                value={cardExpiry}
                                                                onChange={(e) => {
                                                                    const value = e.target.value.replace(/\D/g, "");
                                                                    const formatted =
                                                                        value.length > 2
                                                                            ? `${value.slice(0, 2)}/${value.slice(2, 4)}`
                                                                            : value;
                                                                    setCardExpiry(formatted.slice(0, 5));
                                                                }}
                                                                placeholder="12/25"
                                                                maxLength={5}
                                                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                htmlFor="cardCVC"
                                                                className="mb-2 block text-sm font-medium text-card-foreground"
                                                            >
                                                                CVC
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id="cardCVC"
                                                                value={cardCVC}
                                                                onChange={(e) => {
                                                                    const value = e.target.value.replace(/\D/g, "");
                                                                    setCardCVC(value.slice(0, 3));
                                                                }}
                                                                placeholder="123"
                                                                maxLength={3}
                                                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isProcessing}
                                                        className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? "Obdelovanje..." : `Plačaj ${paymentAmount} €`}
                                                    </button>

                                                    <p className="text-xs text-muted-foreground text-center">
                                                        To je predstavitev plačilnega sistema. Nobenih dejanskih transakcij ne bo izvedenih.
                                                    </p>
                                                </form>
                                            )}

                                            {paymentMode === "request" && (
                                                <form onSubmit={handleRequestPayment} className="space-y-4">
                                                    <div>
                                                        <label
                                                            htmlFor="requestAmount"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Zahtevan znesek (€)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="requestAmount"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                            step="0.01"
                                                            min="0.01"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="requestEmail"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            E-pošta prejemnika
                                                        </label>
                                                        <input
                                                            type="email"
                                                            id="requestEmail"
                                                            value={requestEmail}
                                                            onChange={(e) => setRequestEmail(e.target.value)}
                                                            placeholder="uporabnik@example.com"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="requestDescription"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Opis (neobvezno)
                                                        </label>
                                                        <textarea
                                                            id="requestDescription"
                                                            value={requestDescription}
                                                            onChange={(e) => setRequestDescription(e.target.value)}
                                                            placeholder="Npr. povračilo stroškov večerje"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isProcessing}
                                                        className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? "Pošiljanje..." : "Pošlji zahtevo za plačilo"}
                                                    </button>

                                                    <p className="text-xs text-muted-foreground text-center">
                                                        To je predstavitev sistema za zahtevanje plačil. Nobena dejanska e-pošta ne bo poslana.
                                                    </p>
                                                </form>
                                            )}

                                            {paymentMode === "invest" && (
                                                <form onSubmit={handleInvest} className="space-y-4">
                                                    <div>
                                                        <label
                                                            htmlFor="investmentAmount"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Znesek investicije (€)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="investmentAmount"
                                                            value={investmentAmount}
                                                            onChange={(e) => setInvestmentAmount(e.target.value)}
                                                            step="0.01"
                                                            min="10"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="investmentType"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Tip investicije
                                                        </label>
                                                        <select
                                                            id="investmentType"
                                                            value={investmentType}
                                                            onChange={(e) => setInvestmentType(e.target.value)}
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                        >
                                                            <option value="etf">ETF skladi</option>
                                                            <option value="stocks">Delnice</option>
                                                            <option value="bonds">Obveznice</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label
                                                            htmlFor="investmentHorizon"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Časovni horizont (leta)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            id="investmentHorizon"
                                                            value={investmentHorizon}
                                                            onChange={(e) => setInvestmentHorizon(e.target.value)}
                                                            min="1"
                                                            max="30"
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isProcessing}
                                                        className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? "Izračunavanje..." : "Simuliraj investicijo"}
                                                    </button>

                                                    <p className="text-xs text-muted-foreground text-center">
                                                        To je simulacija investicije in ne predstavlja dejanskega finančnega svetovanja ali izvedbe nakupa.
                                                    </p>
                                                </form>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Opomba o predstavitvi */}
                    <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <p className="text-sm text-muted-foreground">
                            <strong className="font-semibold text-foreground">Opomba:</strong> To je predstavitvena
                            uporabniška profilna stran. V pravi aplikaciji bi se uporabniški podatki pridobili iz vaše
                            zaledne storitve.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}


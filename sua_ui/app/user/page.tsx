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
    User,
    AlertTriangle,
    Plus,
    Trash2,
} from "lucide-react";
import {
    trackPageView,
    trackButtonClick,
    trackPaymentInitiated,
    trackPaymentCompleted,
    trackChartInteraction,
    trackEvent,
} from "@/lib/analytics";
import {
    authApi,
    userApi,
    transactionsApi,
    budgetApi,
    type Transaction,
    type Budget,
} from "@/lib/api";
import { removeToken, getUser, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

interface UserProfile {
    user_id: number;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    settings?: any;
}

export default function UserPage() {
    const router = useRouter();
    const [authenticatedUser, setAuthenticatedUser] = useState<{ id: number; username: string; email: string; name?: string } | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    // Transactions + Budget (moji storitvi)
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [paymentCategory, setPaymentCategory] = useState("Trgovine");
    const [newBudgetLimit, setNewBudgetLimit] = useState("");
    const [editFormData, setEditFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
    });

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

    // Merge authenticated user with demo user data and user profile from user-service
    const user = authenticatedUser
        ? {
            ...demoUser,
            ...authenticatedUser,
            ...(userProfile ? {
                name: userProfile.first_name && userProfile.last_name
                    ? `${userProfile.first_name} ${userProfile.last_name}`
                    : authenticatedUser.name || authenticatedUser.username || authenticatedUser.email,
                phone: userProfile.phone || demoUser.phone,
                location: userProfile.address || demoUser.location,
            } : {}),
            name: userProfile && userProfile.first_name && userProfile.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : authenticatedUser.name || authenticatedUser.username || authenticatedUser.email
        }
        : demoUser;

    const stats = [
        { label: "Skupno stanje", value: userBalance.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), suffix: "€", icon: Wallet, color: "text-primary" },
        { label: "Mesečni prihodki", value: "3.200,00", suffix: "€", icon: ArrowDownCircle, color: "text-emerald-500" },
        { label: "Stroški (transakcije)", value: transactions.reduce((s, t) => s + parseFloat(t.amount), 0).toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), suffix: "€", icon: ArrowUpCircle, color: "text-rose-500" },
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

    // Preslikava kategorija -> ikona + barva (za realne transakcije)
    const categoryStyles: Record<string, { color: string; icon: typeof ShoppingBag }> = {
        Trgovine: { color: "oklch(0.646 0.222 41.116)", icon: ShoppingBag },
        Prehrana: { color: "oklch(0.6 0.118 184.704)", icon: UtensilsCrossed },
        Hrana: { color: "oklch(0.6 0.118 184.704)", icon: UtensilsCrossed },
        Oblačila: { color: "oklch(0.398 0.07 227.392)", icon: Shirt },
        Dom: { color: "oklch(0.828 0.189 84.429)", icon: Home },
        Najem: { color: "oklch(0.828 0.189 84.429)", icon: Home },
        Transport: { color: "oklch(0.769 0.188 70.08)", icon: Car },
        Prevoz: { color: "oklch(0.769 0.188 70.08)", icon: Car },
        Zdravje: { color: "oklch(0.577 0.245 27.325)", icon: Heart },
    };
    const defaultCategoryStyle = { color: "oklch(0.646 0.222 41.116)", icon: Wallet };

    // Realna razdelitev stroškov iz transakcij (vsota po kategoriji)
    const expenseDistribution = (() => {
        const byCategory = new Map<string, number>();
        for (const t of transactions) {
            const cat = t.category || "Ostalo";
            byCategory.set(cat, (byCategory.get(cat) || 0) + parseFloat(t.amount));
        }
        return Array.from(byCategory.entries())
            .map(([name, value]) => {
                const style = categoryStyles[name] || defaultCategoryStyle;
                return { name, value, color: style.color, icon: style.icon };
            })
            .sort((a, b) => b.value - a.value);
    })();

    // Skupna poraba (vsota vseh transakcij) za statistiko
    const totalSpent = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);

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
        const checkAuth = async () => {
            if (isAuthenticated()) {
                const storedUser = getUser();
                if (storedUser) {
                    setAuthenticatedUser(storedUser);
                    trackPageView('/user', storedUser.id);
                    // Load user profile from user-service
                    await loadUserProfile(storedUser.id);
                    await loadUserBalance(storedUser.id);
                    // Naloži transakcije in proračune (moji storitvi)
                    await loadFinanceData();
                } else {
                    trackPageView('/user', demoUser.id);
                }
            } else {
                trackPageView('/user', demoUser.id);
            }
        };
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load user profile from user-service
    const loadUserProfile = async (userId: number) => {
        try {
            setLoadingProfile(true);
            const profile = await userApi.getProfile(userId) as UserProfile;
            setUserProfile(profile);
            // Update edit form data if profile exists
            if (profile) {
                setEditFormData({
                    firstName: profile.first_name || "",
                    lastName: profile.last_name || "",
                    phone: profile.phone || "",
                    address: profile.address || "",
                });
            }
        } catch (error) {
            // Silently fail - user profile might not exist yet
            console.log("Could not load user profile:", error);
            setUserProfile(null);
        } finally {
            setLoadingProfile(false);
        }
    };

    const loadUserBalance = async (userId: number) => {
        try {
            setLoadingBalance(true);
            const response = await userApi.getBalance(userId) as { balance: number };
            setUserBalance(response.balance || 0);
            trackEvent("balance_viewed", { userId, balance: response.balance });
        } catch (error) {
            console.error("Failed to load user balance:", error);
            // Don't show error toast, just use default 0
            setUserBalance(0);
        } finally {
            setLoadingBalance(false);
        }
    };

    // Naloži transakcije in proračune (moji storitvi). warnOnOverflow -> toast ob prekoračitvi
    const loadFinanceData = async (warnOnOverflow = false) => {
        try {
            const [t, b] = await Promise.all([
                transactionsApi.list(),
                budgetApi.list(),
            ]);
            setTransactions(t);
            setBudgets(b);
            if (warnOnOverflow) {
                const over = b.filter(
                    (x) => parseFloat(x.spent) > parseFloat(x.limitamount)
                );
                if (over.length > 0) {
                    toast.warning("Proračun presežen!", {
                        description: `Poraba presega limit pri ${over.length} proračunu(ih).`,
                        duration: 6000,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load finance data:", error);
        }
    };

    const createBudgetFromDashboard = async () => {
        const limitAmount = parseFloat(newBudgetLimit);
        if (isNaN(limitAmount) || limitAmount <= 0) {
            toast.error("Vnesite veljaven limit (> 0)");
            return;
        }
        try {
            await budgetApi.create({ limitAmount });
            toast.success("Proračun ustvarjen");
            setNewBudgetLimit("");
            await loadFinanceData();
        } catch (error) {
            handleApiError(error);
        }
    };

    const deleteBudgetFromDashboard = async (id: number) => {
        try {
            await budgetApi.remove(id);
            toast.success("Proračun izbrisan");
            await loadFinanceData();
        } catch (error) {
            handleApiError(error);
        }
    };

    // Handle profile update
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authenticatedUser) return;

        try {
            setLoadingProfile(true);

            // If profile doesn't exist, create it first
            if (!userProfile) {
                await userApi.createProfile({
                    firstName: editFormData.firstName,
                    lastName: editFormData.lastName,
                    phone: editFormData.phone,
                    address: editFormData.address,
                });

                // Track profile creation event
                trackEvent("profile_created", {
                    userId: authenticatedUser.id,
                    metadata: {
                        fields: Object.keys(editFormData).filter(
                            key => editFormData[key as keyof typeof editFormData]
                        ),
                    },
                });
            } else {
                await userApi.updateProfile(authenticatedUser.id, {
                    firstName: editFormData.firstName,
                    lastName: editFormData.lastName,
                    phone: editFormData.phone,
                    address: editFormData.address,
                });

                // Track profile update event
                trackEvent("profile_updated", {
                    userId: authenticatedUser.id,
                    metadata: {
                        fields_updated: Object.keys(editFormData).filter(
                            key => editFormData[key as keyof typeof editFormData]
                        ),
                    },
                });
            }

            // Reload profile
            await loadUserProfile(authenticatedUser.id);
            setIsEditingProfile(false);
            toast.success(userProfile ? "Profil uspešno posodobljen" : "Profil uspešno ustvarjen");
        } catch (error) {
            handleApiError(error);
            toast.error("Napaka pri shranjevanju profila");
        } finally {
            setLoadingProfile(false);
        }
    };

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
        setTimeout(async () => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            // Track payment completed
            trackPaymentCompleted(amount, transactionId, 'EUR', user.id);

            // Update balance in user-service (subtract amount)
            if (authenticatedUser) {
                try {
                    await userApi.updateBalance(authenticatedUser.id, amount, 'subtract');
                    await loadUserBalance(authenticatedUser.id);
                } catch (error) {
                    console.error('Failed to update balance:', error);
                }
            }

            // Ustvari pravo transakcijo -> transactions-service sam posodobi proračun
            try {
                await transactionsApi.create({ amount, category: paymentCategory });
                await loadFinanceData(true); // osveži + opozori ob prekoračitvi proračuna
            } catch (error) {
                console.error('Failed to create transaction:', error);
            }

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

        setTimeout(async () => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            // Update balance in user-service (add amount - simulating received payment)
            if (authenticatedUser) {
                try {
                    await userApi.updateBalance(authenticatedUser.id, amount, 'add');
                    await loadUserBalance(authenticatedUser.id);
                } catch (error) {
                    console.error('Failed to update balance:', error);
                }
            }

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

        setTimeout(async () => {
            setIsProcessing(false);
            setPaymentSuccess(true);

            // Update balance in user-service (subtract investment amount)
            if (authenticatedUser) {
                try {
                    await userApi.updateBalance(authenticatedUser.id, amount, 'subtract');
                    await loadUserBalance(authenticatedUser.id);
                } catch (error) {
                    console.error('Failed to update balance:', error);
                }
            }

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
                            <Link
                                href="/analytics"
                                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <BarChart3 className="h-4 w-4" />
                                Moji dogodki
                            </Link>
                            <Link
                                href="/finance"
                                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <Wallet className="h-4 w-4" />
                                Transakcije in proračun
                            </Link>
                            <Link
                                href="/statistics"
                                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <BarChart3 className="h-4 w-4" />
                                Statistika
                            </Link>

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
                                        {loadingBalance ? '...' : userBalance.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </p>
                                    <p className="mt-1 text-xs sm:text-sm opacity-80">
                                        Osebni račun · EUR
                                    </p>
                                </div>
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/30 bg-white/20 flex items-center justify-center text-white font-semibold text-lg sm:text-xl">
                                    {user.name.charAt(0).toUpperCase()}
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
                                            {user.name}
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

                        {/* Proračun (budget-service) — realni podatki */}
                        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="h-5 w-5 text-primary" />
                                    <h2 className="text-sm font-semibold text-card-foreground">
                                        Proračun
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {budgets.length} {budgets.length === 1 ? "proračun" : "proračunov"}
                                </span>
                            </div>

                            {/* Forma za nov proračun */}
                            <div className="mb-3 flex gap-2">
                                <input
                                    type="number"
                                    value={newBudgetLimit}
                                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                                    placeholder="Limit (€)"
                                    className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <button
                                    onClick={createBudgetFromDashboard}
                                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Dodaj
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                {budgets.length === 0 && (
                                    <p className="text-muted-foreground">Ni proračunov. Ustvarite enega zgoraj.</p>
                                )}
                                {budgets.map((b) => {
                                    const limit = parseFloat(b.limitamount);
                                    const spent = parseFloat(b.spent);
                                    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                                    const over = spent > limit;
                                    return (
                                        <div key={b.id}>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="flex items-center gap-1 font-medium text-card-foreground">
                                                    Proračun #{b.id}
                                                    {over && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <span className={over ? "text-rose-500 font-semibold" : "text-muted-foreground"}>
                                                        {spent.toFixed(2)} € / {limit.toFixed(2)} €
                                                    </span>
                                                    <button
                                                        onClick={() => deleteBudgetFromDashboard(b.id)}
                                                        className="text-muted-foreground hover:text-rose-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
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
                                {expenseDistribution.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Ni transakcij. Uporabite &quot;Plačaj&quot; za dodajanje stroška.
                                    </p>
                                )}
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

                    {/* User Profile Section */}
                    {isAuthenticated() && authenticatedUser && (
                        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-card-foreground">
                                        Moj profil
                                    </h2>
                                </div>
                                {!isEditingProfile && (
                                    <button
                                        onClick={() => setIsEditingProfile(true)}
                                        className="rounded-lg border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5"
                                    >
                                        Uredi profil
                                    </button>
                                )}
                            </div>

                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="firstName"
                                                className="mb-2 block text-sm font-medium text-card-foreground"
                                            >
                                                Ime
                                            </label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                value={editFormData.firstName}
                                                onChange={(e) =>
                                                    setEditFormData({
                                                        ...editFormData,
                                                        firstName: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder="Janez"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="lastName"
                                                className="mb-2 block text-sm font-medium text-card-foreground"
                                            >
                                                Priimek
                                            </label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                value={editFormData.lastName}
                                                onChange={(e) =>
                                                    setEditFormData({
                                                        ...editFormData,
                                                        lastName: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder="Novak"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="phone"
                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                        >
                                            Telefon
                                        </label>
                                        <input
                                            type="text"
                                            id="phone"
                                            value={editFormData.phone}
                                            onChange={(e) =>
                                                setEditFormData({
                                                    ...editFormData,
                                                    phone: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="+386 1 234 5678"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="address"
                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                        >
                                            Naslov
                                        </label>
                                        <input
                                            type="text"
                                            id="address"
                                            value={editFormData.address}
                                            onChange={(e) =>
                                                setEditFormData({
                                                    ...editFormData,
                                                    address: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="Ljubljana, Slovenija"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={loadingProfile}
                                            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingProfile ? "Shranjevanje..." : "Shrani spremembe"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingProfile(false);
                                                // Reset form data
                                                if (userProfile) {
                                                    setEditFormData({
                                                        firstName: userProfile.first_name || "",
                                                        lastName: userProfile.last_name || "",
                                                        phone: userProfile.phone || "",
                                                        address: userProfile.address || "",
                                                    });
                                                }
                                            }}
                                            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-accent"
                                        >
                                            Prekliči
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                        <span className="text-muted-foreground">Ime in priimek</span>
                                        <span className="font-medium text-card-foreground">
                                            {user.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                        <span className="text-muted-foreground">Email</span>
                                        <span className="font-medium text-card-foreground">
                                            {authenticatedUser.email}
                                        </span>
                                    </div>
                                    {userProfile && (
                                        <>
                                            {userProfile.phone && (
                                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                                    <span className="text-muted-foreground">Telefon</span>
                                                    <span className="font-medium text-card-foreground">
                                                        {userProfile.phone}
                                                    </span>
                                                </div>
                                            )}
                                            {userProfile.address && (
                                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                                    <span className="text-muted-foreground">Naslov</span>
                                                    <span className="font-medium text-card-foreground">
                                                        {userProfile.address}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {loadingProfile && (
                                        <div className="text-center text-xs text-muted-foreground">
                                            Nalaganje profila...
                                        </div>
                                    )}
                                    {!userProfile && !loadingProfile && (
                                        <div className="text-center text-xs text-muted-foreground">
                                            Profil še ni nastavljen. Kliknite "Uredi profil" za nastavitev.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

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
                                                            htmlFor="paymentCategory"
                                                            className="mb-2 block text-sm font-medium text-card-foreground"
                                                        >
                                                            Kategorija
                                                        </label>
                                                        <select
                                                            id="paymentCategory"
                                                            value={paymentCategory}
                                                            onChange={(e) => setPaymentCategory(e.target.value)}
                                                            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                        >
                                                            <option>Trgovine</option>
                                                            <option>Prehrana</option>
                                                            <option>Oblačila</option>
                                                            <option>Dom</option>
                                                            <option>Transport</option>
                                                            <option>Zdravje</option>
                                                        </select>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Plačilo ustvari transakcijo in posodobi proračun.
                                                        </p>
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


                </div>
            </main>
        </div>
    );
}


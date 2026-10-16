
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; 
import { Link } from "react-router-dom";
import "./Subscriptions.css";
import { API_BASE_URL } from "../config/api.js";

const API = API_BASE_URL;

const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

function Subscriptions() {
    const { t, i18n } = useTranslation();

    const token = localStorage.getItem("token");

    const [plans, setPlans] = useState([]);
    const [current, setCurrent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busyPlan, setBusyPlan] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceError, setInvoiceError] = useState("");

    const request = useCallback(
        async (path, options = {}) => {
            if (!token) {
                throw new Error(t("subscriptions.loginRequired"));
            }

            const response = await fetch(`${API}${path}`, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || t("subscriptions.requestFailed")
                );
            }

            return data;
        },
        [token]
    );

    const loadPlans = useCallback(async () => {
        if (!token) {
            setError("Please log in to manage your subscription.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [planData, currentData] = await Promise.all([
                request("/api/subscriptions/plans"),
                request("/api/subscriptions/current"),
            ]);

            setPlans(
                Array.isArray(planData)
                    ? planData
                    : planData.plans || []
            );

            setCurrent(
                currentData?.subscription ||
                currentData?.current ||
                currentData
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [request, token]);

    const loadHistory = useCallback(async () => {
        if (!token) {
            setHistory([]);
            setHistoryLoading(false);
            setHistoryError("Please log in to view payment history.");
            return;
        }

        setHistoryLoading(true);
        setHistoryError("");

        try {
            const data = await request("/api/subscriptions/history");

            setHistory(
                Array.isArray(data)
                    ? data
                    : data.history || []
            );
        } catch (err) {
            setHistoryError(err.message);
        } finally {
            setHistoryLoading(false);
        }
    }, [request, token]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => loadPlans(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [loadPlans]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => loadHistory(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [loadHistory]);

    const activateFree = async () => {
        setBusyPlan("Free");
        setMessage("");
        setError("");

        try {
            const data = await request(
                "/api/subscriptions/activate-free",
                { method: "POST" }
            );

            setMessage(data.message || "Free plan activated.");

            await Promise.all([loadPlans(), loadHistory()]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyPlan(null);
        }
    };

    const buyPlan = async (plan) => {
        if (busyPlan !== null) return;

        setBusyPlan(plan.plan_name);
        setMessage("");
        setError("");

        try {
            const scriptLoaded = await loadRazorpayScript();

            if (!scriptLoaded) {
                throw new Error(
                    "Could not load Razorpay checkout. Check your internet connection."
                );
            }

            const data = await request(
                "/api/subscriptions/create-order",
                {
                    method: "POST",
                    body: JSON.stringify({ plan_id: plan.id }),
                }
            );

            const orderId = data.order.id;

            const options = {
                key: data.key_id,
                amount: data.order.amount,
                currency: data.order.currency,
                name: "Internship Portal",
                description: `${plan.plan_name} Monthly Subscription`,
                order_id: orderId,

                handler: async (paymentResponse) => {
                    try {
                        const verification = await request(
                            "/api/subscriptions/verify-payment",
                            {
                                method: "POST",
                                body: JSON.stringify(paymentResponse),
                            }
                        );

                        setMessage(
                            verification.already_verified
                                ? "This payment was already verified. Check your subscription history."
                                : `Payment verified! ${verification.plan_name} plan activated. Invoice: ${verification.invoice_number ||
                                "Check Payment History"
                                }`
                        );

                        setError("");
                        await Promise.all([loadPlans(), loadHistory()]);
                    } catch (err) {
                        setError(
                            `${err.message} If money was deducted, check Subscription History before paying again.`
                        );
                        await loadHistory();
                    } finally {
                        setBusyPlan(null);
                    }
                },

                modal: {
                    ondismiss: () => {
                        setBusyPlan(null);
                    },
                },

                theme: {
                    color: "#4f46e5",
                },
            };

            const checkout = new window.Razorpay(options);

            checkout.on("payment.failed", async (response) => {
                try {
                    const failedOrderId =
                        response?.error?.metadata?.order_id || orderId;

                    if (failedOrderId) {
                        await request(
                            "/api/subscriptions/payment-failed",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    razorpay_order_id: failedOrderId,
                                }),
                            }
                        );
                    }

                    await loadHistory();
                } catch (err) {
                    console.error("Failed to update payment status:", err);
                } finally {
                    setBusyPlan(null);
                    setError(
                        response?.error?.description ||
                        "Payment failed. Check Payment History before retrying."
                    );
                }
            });

            checkout.open();
        } catch (err) {
            setError(err.message);
            setBusyPlan(null);
        }
    };

    // View an actual invoice from a verified payment
    const viewInvoice = async (payment) => {
        if (!payment.id) {
            setInvoiceError("Payment record ID is missing.");
            return;
        }

        setSelectedInvoice(null);
        setInvoiceError("");
        setInvoiceLoading(true);

        try {
            const data = await request(
                `/api/subscriptions/invoice/${payment.id}`
            );

            setSelectedInvoice({
                ...data,
                is_demo: false,
            });
        } catch (err) {
            setInvoiceError(err.message || "Unable to load invoice.");
        } finally {
            setInvoiceLoading(false);
        }
    };

    // Demo invoice only: does not create a payment or database record
    const showDemoInvoice = () => {
        const now = new Date();

        const expires = new Date(now);
        expires.setDate(expires.getDate() + 30);

        setInvoiceError("");
        setSelectedInvoice({
            invoice_number: "DEMO-2026-000001",
            billing_name: "Demo Customer",
            billing_email: "demo@example.com",
            plan_name: "Bronze",
            amount: 10000,
            currency: "INR",
            razorpay_payment_id: "DEMO_TRANSACTION_NOT_REAL",
            invoice_date: now.toISOString(),
            paid_at: now.toISOString(),
            started_at: now.toISOString(),
            expires_at: expires.toISOString(),
            is_demo: true,
        });
    };

    const closeInvoice = () => {
        setSelectedInvoice(null);
        setInvoiceError("");
    };

    const formatLimit = (limit) =>
        limit === null || limit === undefined
            ? t("subscriptions.unlimited")
            : Number(limit) === 1
                ? t("subscriptions.applicationSingle", { count: limit })
                : t("subscriptions.applicationMultiple", { count: limit });

    const formatDate = (value) => {
        if (!value) return "-";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleDateString(i18n.language, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
    };

    const formatDateTime = (value) => {
        if (!value) return "-";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
    };

    const formatStatus = (status) => {
        const statuses = {
            created: t("subscriptions.pending"),
            paid: t("subscriptions.paid"),
            failed: t("subscriptions.failed"),
            cancelled: t("subscriptions.cancelled"),
        };

        return statuses[String(status || "").toLowerCase()] ||
            status ||
            "-";
    };

    const formatInvoiceAmount = (amount) =>
        (Number(amount || 0) / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const printInvoice = () => {
        if (selectedInvoice) {
            window.print();
        }
    };

    return (
        <main className="subscription-page">
            <Link to="/" className="back-home-btn">
                {t("subscriptions.backHome")}
            </Link>

            <header className="subscription-page-header">
                <div>
                    <p className="subscription-eyebrow">
                        {t("subscriptions.membership")}
                    </p>
                    <h1>{t("subscriptions.chooseSubscription")}</h1>
                    <p>{t("subscriptions.subtitle")}</p>

                    <Link to="/internships" className="back-internships">
                        {t("subscriptions.browseInternships")}
                    </Link>
                </div>
            </header>

            {current && (
                <section className="current-plan-banner">
                    <div>
                        <span>{t("subscriptions.currentPlan")}</span>
                        <h2>
                            {t(`subscriptions.plans.${String(current.plan_name || "Free").toLowerCase()}`)}
                        </h2>
                        <p>{formatLimit(current.application_limit)}</p>
                    </div>

                    {current.expires_at && (
                        <div>
                            <span>{t("subscriptions.validUntil")}</span>                            <strong>{formatDate(current.expires_at)}</strong>
                        </div>
                    )}
                </section>
            )}

            {message && (
                <p className="subscription-notice success">{message}</p>
            )}

            {error && (
                <p className="subscription-notice error">{error}</p>
            )}

            {loading ? (
                <p className="subscription-loading">
                    {t("subscriptions.loadingPlans")}
                </p>            ) : (
                <section className="subscription-plan-grid">
                    {plans.map((plan) => {
                        const isFree = plan.plan_name === "Free";

                        const isCurrent =
                            current?.plan_name === plan.plan_name &&
                            (!isFree || Boolean(current?.subscription_id));

                        const paidPlanActive =
                            Boolean(current?.subscription_id) &&
                            current?.plan_name !== "Free";

                        return (
                            <article
                                key={plan.id}
                                className={`subscription-plan-card ${String(
                                    plan.plan_name
                                ).toLowerCase()} ${isCurrent ? "selected-plan" : ""
                                    }`}
                            >
                                {isCurrent && (
                                    <span className="current-plan-tag">
                                        {t("subscriptions.planCurrent")}
                                    </span>
                                )}

                                <h2>
                                    {t(`subscriptions.plans.${String(plan.plan_name).toLowerCase()}`)}
                                </h2>

                                <span>{t("subscriptions.perMonth")}</span>

                                <ul>
                                    <li>{t("subscriptions.applyEligible")}</li>
                                    <li>{t("subscriptions.trackStatus")}</li>
                                    <li>{t("subscriptions.viewHistory")}</li>
                                </ul>

                                {isCurrent ? (
                                    <button
                                        type="button"
                                        className="plan-action"
                                        disabled
                                    >
                                        {t("subscriptions.planCurrent")}                                    </button>
                                ) : isFree ? (
                                    <button
                                        type="button"
                                        className="plan-action"
                                        disabled={
                                            Boolean(paidPlanActive) ||
                                            busyPlan !== null
                                        }
                                        onClick={activateFree}
                                    >
                                            {paidPlanActive
                                                ? t("subscriptions.cancelPaidFirst")
                                                : busyPlan === "Free"
                                                    ? t("subscriptions.activating")
                                                    : t("subscriptions.activateFree")}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="plan-action"
                                        disabled={busyPlan !== null}
                                        onClick={() => buyPlan(plan)}
                                    >
                                                {busyPlan === plan.plan_name
                                                    ? t("subscriptions.pleaseWait")
                                                    : t("subscriptions.choosePlan")}
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}

            <p className="payment-window-note">
                {t("subscriptions.paymentWindow")}
            </p>

            <section className="subscription-history">
                <div className="subscription-history-heading">
                    <div>
                        <h2>{t("subscriptions.paymentHistory")}</h2>
                        <p>{t("subscriptions.historySubtitle")}</p>
                    </div>

                    <div className="subscription-history-actions">
                        <button
                            type="button"
                            onClick={loadHistory}
                            disabled={historyLoading}
                        >
                            {historyLoading
                                ? t("subscriptions.refreshing")
                                : t("subscriptions.refreshHistory")}
                        </button>

                        <button
                            type="button"
                            onClick={showDemoInvoice}
                        >
                            {t("subscriptions.demoInvoice")}                        </button>
                    </div>
                </div>

                {historyLoading ? (
                    <p>{t("subscriptions.loadingHistory")}</p>                ) : historyError ? (
                    <p className="subscription-notice error">
                        {historyError}
                    </p>
                ) : history.length === 0 ? (
                            <p className="subscription-history-empty">
                                {t("subscriptions.noTransactions")}
                            </p>
                ) : (
                    <div className="subscription-history-table-wrapper">
                        <table className="subscription-history-table">
                            <thead>
                                <tr>
                                                <th>{t("subscriptions.date")}</th>
                                                <th>{t("subscriptions.plan")}</th>
                                                <th>{t("subscriptions.amount")}</th>
                                                <th>{t("subscriptions.status")}</th>
                                                <th>{t("subscriptions.transactionId")}</th>
                                                <th>{t("subscriptions.invoice")}</th>
                                </tr>
                            </thead>

                            <tbody>
                                {history.map((item) => {
                                    const amount =
                                        item.amount ??
                                        Number(item.amount_paise || 0) / 100;

                                    const isPaid =
                                        String(item.status || "").toLowerCase() === "paid";

                                    return (
                                        <tr
                                            key={
                                                item.id ||
                                                item.payment_id ||
                                                item.razorpay_order_id
                                            }
                                        >
                                            <td>{formatDate(item.created_at)}</td>
                                            <td>
                                                {item.plan_name
                                                    ? t(`subscriptions.plans.${String(item.plan_name).toLowerCase()}`, {
                                                        defaultValue: item.plan_name,
                                                    })
                                                    : "-"}
                                            </td>

                                            <td>
                                                ₹{Number(amount || 0).toLocaleString(
                                                    "en-IN",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    }
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`payment-status ${String(
                                                        item.status || ""
                                                    ).toLowerCase()}`}
                                                >
                                                    {formatStatus(item.status)}
                                                </span>
                                            </td>

                                            <td className="transaction-id">
                                                {item.razorpay_payment_id ||
                                                    item.transaction_id ||
                                                    "-"}
                                            </td>

                                            <td>
                                                {isPaid && item.invoice_number ? (
                                                    <button
                                                        type="button"
                                                        className="invoice-view-btn"
                                                        onClick={() => viewInvoice(item)}
                                                    >
                                                        {t("subscriptions.viewInvoice")}                                                    </button>
                                                ) : (
                                                    item.invoice_number || "-"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {invoiceLoading && (
                <div className="invoice-overlay" role="status">
                    <div className="invoice-message">
                        {t("subscriptions.loadingInvoice")}
                    </div>
                </div>
            )}

            {invoiceError && (
                <div className="invoice-overlay">
                    <section className="invoice-error-panel">
                        <p>{invoiceError}</p>
                        <button
                            type="button"
                            onClick={() => setInvoiceError("")}
                        >
                            {t("subscriptions.close")}
                        </button>
                    </section>
                </div>
            )}

            {selectedInvoice && (
                <div className="invoice-overlay">
                    <section
                        className="invoice-print-area"
                        aria-label="Payment invoice"
                    >
                        <div className="invoice-actions">
                            <button
                                type="button"
                                onClick={printInvoice}
                            >
                                {t("subscriptions.printInvoice")}                            </button>

                            <button
                                type="button"
                                onClick={closeInvoice}
                            >
                                {t("subscriptions.close")}
                            </button>
                        </div>

                        <div className="invoice-heading">
                            <p className="subscription-eyebrow">
                                {t("subscriptions.portalName")}
                            </p>

                            {selectedInvoice.is_demo && (
                                <p className="demo-invoice-warning">
                                    {t("subscriptions.sampleWarning")}
                                </p>
                            )}

                            <h2>{t("subscriptions.invoiceTitle")}</h2>
                            <p>{t("subscriptions.invoiceSubtitle")}</p>
                        </div>

                        <div className="invoice-number-row">
                            <span>{t("subscriptions.invoiceNumber")}</span>
                            <strong>{selectedInvoice.invoice_number || "-"}</strong>
                        </div>

                        <div className="invoice-detail-grid">
                            <div>
                                <span>{t("subscriptions.billTo")}</span>
                                <strong>{selectedInvoice.billing_name || "-"}</strong>
                                <p>{selectedInvoice.billing_email || "-"}</p>
                            </div>

                            <div>
                                <span>{t("subscriptions.invoiceDate")}</span>
                                <strong>{formatDate(selectedInvoice.invoice_date)}</strong>
                            </div>
                        </div>

                        <table className="invoice-items-table">
                            <thead>
                                <tr>
                                    <th>{t("subscriptions.description")}</th>
                                    <th>{t("subscriptions.amount")}</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        {t(`subscriptions.plans.${String(selectedInvoice.plan_name || "").toLowerCase()}`, {
                                            defaultValue: selectedInvoice.plan_name || "-",
                                        })}{" "}
                                        {t("subscriptions.monthlySubscription")}
                                    </td>
                                    <td>
                                        {selectedInvoice.currency || "INR"}{" "}
                                        {formatInvoiceAmount(selectedInvoice.amount)}
                                    </td>
                                </tr>
                            </tbody>

                            <tfoot>
                                <tr>
                                    <th>
                                        {t("subscriptions.total")}{" "}
                                        {selectedInvoice.is_demo
                                            ? `(${t("subscriptions.demo")})`
                                            : t("subscriptions.paid")}
                                    </th>
                                    <th>
                                        {selectedInvoice.currency || "INR"}{" "}
                                        {formatInvoiceAmount(selectedInvoice.amount)}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="invoice-payment-details">
                            <h3>{t("subscriptions.paymentDetails")}</h3>

                            <p>
                                <span>{t("subscriptions.transactionId")}</span>
                                <strong>
                                    {selectedInvoice.razorpay_payment_id || "-"}
                                </strong>
                            </p>

                            <p>
                                <span>{t("subscriptions.paymentDate")}</span>
                                <strong>{formatDateTime(selectedInvoice.paid_at)}</strong>
                            </p>

                            <p>
                                <span>{t("subscriptions.status")}</span>
                                <strong className={
                                    selectedInvoice.is_demo
                                        ? "invoice-demo-status"
                                        : "invoice-paid-status"
                                }>
                                    {selectedInvoice.is_demo
                                        ? t("subscriptions.demoNotPaid")
                                        : t("subscriptions.paid")}
                                </strong>
                            </p>

                            <p>
                                <span>{t("subscriptions.subscriptionStarts")}</span>
                                <strong>{formatDate(selectedInvoice.started_at)}</strong>
                            </p>

                            <p>
                                <span>{t("subscriptions.subscriptionExpires")}</span>
                                <strong>{formatDate(selectedInvoice.expires_at)}</strong>
                            </p>
                        </div>

                        <p className="invoice-footer">
                            {selectedInvoice.is_demo
                                ? t("subscriptions.demoFooter")
                                : t("subscriptions.invoiceFooter")}
                        </p>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Subscriptions;

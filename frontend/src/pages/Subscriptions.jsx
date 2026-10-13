
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Subscriptions.css";

const API = "http://localhost:5000";

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
                throw new Error("Please log in to continue.");
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
                    data.message || "Request failed. Please try again."
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
        loadPlans();
    }, [loadPlans]);

    useEffect(() => {
        loadHistory();
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
            ? "Unlimited applications"
            : `${limit} application${Number(limit) === 1 ? "" : "s"} per billing cycle`;

    const formatDate = (value) => {
        if (!value) return "-";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleDateString("en-IN", {
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
            created: "Pending",
            paid: "Paid",
            failed: "Failed",
            cancelled: "Cancelled",
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
                ← Back to Home
            </Link>

            <header className="subscription-page-header">
                <div>
                    <p className="subscription-eyebrow">MEMBERSHIP</p>
                    <h1>Choose Your Subscription</h1>
                    <p>Pick a plan that fits your internship search.</p>
                </div>

                <Link to="/internships" className="back-internships">
                    Browse Internships
                </Link>
            </header>

            {current && (
                <section className="current-plan-banner">
                    <div>
                        <span>YOUR CURRENT PLAN</span>
                        <h2>{current.plan_name || "Free"}</h2>
                        <p>{formatLimit(current.application_limit)}</p>
                    </div>

                    {current.expires_at && (
                        <div>
                            <span>VALID UNTIL</span>
                            <strong>{formatDate(current.expires_at)}</strong>
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
                <p className="subscription-loading">Loading plans...</p>
            ) : (
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
                                        Current Plan
                                    </span>
                                )}

                                <h2>{plan.plan_name}</h2>

                                <p className="plan-price">
                                    ₹{Number(plan.monthly_price).toLocaleString("en-IN")}
                                    <span>/month</span>
                                </p>

                                <p className="plan-limit">
                                    {formatLimit(plan.application_limit)}
                                </p>

                                <ul>
                                    <li>Apply to eligible internships</li>
                                    <li>Track your application status</li>
                                    <li>View your application history</li>
                                </ul>

                                {isCurrent ? (
                                    <button
                                        type="button"
                                        className="plan-action"
                                        disabled
                                    >
                                        Current Plan
                                    </button>
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
                                            ? "Cancel paid plan first"
                                            : busyPlan === "Free"
                                                ? "Activating..."
                                                : "Activate Free"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="plan-action"
                                        disabled={busyPlan !== null}
                                        onClick={() => buyPlan(plan)}
                                    >
                                        {busyPlan === plan.plan_name
                                            ? "Please wait..."
                                            : "Choose Plan"}
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}

            <p className="payment-window-note">
                Payments can be initiated only between 5:00 AM and
                11:45 AM IST. Your plan activates after server-side
                payment verification.
            </p>

            <section className="subscription-history">
                <div className="subscription-history-heading">
                    <div>
                        <h2>Payment History</h2>
                        <p>View your subscription transactions and invoices.</p>
                    </div>

                    <div className="subscription-history-actions">
                        <button
                            type="button"
                            onClick={loadHistory}
                            disabled={historyLoading}
                        >
                            {historyLoading ? "Refreshing..." : "Refresh History"}
                        </button>

                        <button
                            type="button"
                            onClick={showDemoInvoice}
                        >
                            Preview Demo Invoice
                        </button>
                    </div>
                </div>

                {historyLoading ? (
                    <p>Loading payment history...</p>
                ) : historyError ? (
                    <p className="subscription-notice error">
                        {historyError}
                    </p>
                ) : history.length === 0 ? (
                    <p className="subscription-history-empty">
                        No payment transactions found yet.
                    </p>
                ) : (
                    <div className="subscription-history-table-wrapper">
                        <table className="subscription-history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Plan</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Transaction ID</th>
                                    <th>Invoice</th>
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
                                            <td>{item.plan_name || "-"}</td>

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
                                                        View Invoice
                                                    </button>
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
                        Loading invoice...
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
                            Close
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
                                Print / Save as PDF
                            </button>

                            <button
                                type="button"
                                onClick={closeInvoice}
                            >
                                Close
                            </button>
                        </div>

                        <div className="invoice-heading">
                            <p className="subscription-eyebrow">
                                INTERNSHIP PORTAL
                            </p>

                            {selectedInvoice.is_demo && (
                                <p className="demo-invoice-warning">
                                    SAMPLE — NOT A REAL PAYMENT
                                </p>
                            )}

                            <h2>Payment Invoice</h2>
                            <p>Subscription payment receipt</p>
                        </div>

                        <div className="invoice-number-row">
                            <span>Invoice Number</span>
                            <strong>{selectedInvoice.invoice_number || "-"}</strong>
                        </div>

                        <div className="invoice-detail-grid">
                            <div>
                                <span>Bill To</span>
                                <strong>{selectedInvoice.billing_name || "-"}</strong>
                                <p>{selectedInvoice.billing_email || "-"}</p>
                            </div>

                            <div>
                                <span>Invoice Date</span>
                                <strong>{formatDate(selectedInvoice.invoice_date)}</strong>
                            </div>
                        </div>

                        <table className="invoice-items-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        {selectedInvoice.plan_name} Monthly Subscription
                                    </td>
                                    <td>
                                        {selectedInvoice.currency || "INR"}{" "}
                                        {formatInvoiceAmount(selectedInvoice.amount)}
                                    </td>
                                </tr>
                            </tbody>

                            <tfoot>
                                <tr>
                                    <th>Total {selectedInvoice.is_demo ? " (Demo)" : "Paid"}</th>
                                    <th>
                                        {selectedInvoice.currency || "INR"}{" "}
                                        {formatInvoiceAmount(selectedInvoice.amount)}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="invoice-payment-details">
                            <h3>Payment Details</h3>

                            <p>
                                <span>Transaction ID</span>
                                <strong>
                                    {selectedInvoice.razorpay_payment_id || "-"}
                                </strong>
                            </p>

                            <p>
                                <span>Payment Date</span>
                                <strong>{formatDateTime(selectedInvoice.paid_at)}</strong>
                            </p>

                            <p>
                                <span>Status</span>
                                <strong className={
                                    selectedInvoice.is_demo
                                        ? "invoice-demo-status"
                                        : "invoice-paid-status"
                                }>
                                    {selectedInvoice.is_demo
                                        ? "DEMO — NOT PAID"
                                        : "Paid"}
                                </strong>
                            </p>

                            <p>
                                <span>Subscription Starts</span>
                                <strong>{formatDate(selectedInvoice.started_at)}</strong>
                            </p>

                            <p>
                                <span>Subscription Expires</span>
                                <strong>{formatDate(selectedInvoice.expires_at)}</strong>
                            </p>
                        </div>

                        <p className="invoice-footer">
                            {selectedInvoice.is_demo
                                ? "This is a sample invoice for UI testing only. No payment was made."
                                : "Thank you for choosing Internship Portal. Please keep this invoice for your records."}
                        </p>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Subscriptions;
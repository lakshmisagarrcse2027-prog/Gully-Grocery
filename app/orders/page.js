"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import { useLanguage } from "../../components/LanguageContext";

export default function CustomerOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const steps = [
    { key: "Order Placed", label: "Order Placed", icon: "📝" },
    { key: "Processing", label: "Processing", icon: "🔄" },
    { key: "Out for Delivery", label: "Out for Delivery", icon: "🚚" },
    { key: "Delivered", label: "Delivered", icon: "✅" }
  ];

  const getStepIndex = (status) => {
    if (!status) return 0;
    const lower = status.toLowerCase();
    if (lower.includes("delivered")) return 3;
    if (lower.includes("out for delivery")) return 2;
    if (lower.includes("processing")) return 1;
    return 0; // "Order Placed"
  };

  const fetchOrders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/orders", {
      headers: {
        Authorization: "Bearer " + token
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders);
          setLastUpdated(new Date().toLocaleTimeString());

          // Mark current statuses as seen
          const statusMap = {};
          data.orders.forEach((o) => {
            statusMap[o.id] = o.status;
          });
          localStorage.setItem("customer_order_statuses", JSON.stringify(statusMap));
          window.dispatchEvent(new Event("orderstatusseen"));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer orders:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      setUser(u);
    } catch {}

    fetchOrders();

    // Auto-refresh every 8 seconds for real-time owner update notifications
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!user && !loading) {
    return (
      <>
        <Nav />
        <main style={{ maxWidth: "700px", margin: "60px auto", textAlign: "center" }}>
          <div style={{ background: "white", padding: "40px", borderRadius: "16px", border: "1px solid #dce8df" }}>
            <h2>🔐 Customer Login Required</h2>
            <p style={{ color: "#567064", marginBottom: "20px" }}>
              Please sign in to your customer account to view and track your orders.
            </p>
            <Link href="/login">
              <button style={{ padding: "12px 24px" }}>Sign In as Customer →</button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: "980px", margin: "30px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", color: "#183026" }}>
              📦 My Orders & Live Tracking
            </h1>
            <p style={{ margin: 0, color: "#567064", fontSize: "14px" }}>
              Track the progress of your grocery orders across registered local stores.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {lastUpdated && (
              <span style={{ fontSize: "12px", color: "#708077" }}>
                Updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={fetchOrders}
              style={{
                background: "#eaf6ee",
                color: "#176b45",
                border: "1px solid #cbe3d3",
                padding: "8px 14px",
                fontSize: "13px"
              }}
            >
              🔄 Refresh Status
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px" }}>
            <p style={{ color: "#567064" }}>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", border: "1px solid #e2ece5" }}>
            <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>🛍️</span>
            <h3 style={{ margin: "0 0 8px 0" }}>No Orders Placed Yet</h3>
            <p style={{ color: "#567064", marginBottom: "20px" }}>
              You haven't placed any orders yet. Browse our fresh local groceries and order today!
            </p>
            <Link href="/">
              <button>Browse Local Groceries →</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {orders.map((o) => {
              const currentStep = getStepIndex(o.status);
              const isCancelled = o.status?.toLowerCase().includes("cancelled");

              return (
                <div
                  key={o.id}
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    border: "1px solid #dce8df",
                    padding: "24px",
                    boxShadow: "0 4px 20px rgba(23, 61, 44, 0.04)"
                  }}
                >
                  {/* Order Top Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderBottom: "1px solid #f0f4f1",
                      paddingBottom: "14px",
                      marginBottom: "18px",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#183026" }}>
                          Order #{o.id}
                        </span>
                        <span
                          style={{
                            background: "#eaf6ee",
                            color: "#176b45",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "1px solid #cbe3d3"
                          }}
                        >
                          🏪 {o.store_name || "SmartGrocer Central"}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#708077", marginTop: "4px", display: "block" }}>
                        Placed on: {o.created_at || "Recent"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "20px", fontWeight: 800, color: "#176b45" }}>
                        ₹{o.total}
                      </span>
                      <div style={{ fontSize: "12px", color: "#567064", marginTop: "2px" }}>
                        {o.delivery_type} • {o.payment_method}
                      </div>
                    </div>
                  </div>

                  {/* Visual Status Progress Tracker */}
                  {!isCancelled ? (
                    <div style={{ margin: "20px 0 24px 0" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: "8px",
                          position: "relative"
                        }}
                      >
                        {steps.map((s, idx) => {
                          const isCompleted = idx <= currentStep;
                          const isCurrent = idx === currentStep;

                          return (
                            <div
                              key={s.key}
                              style={{
                                textAlign: "center",
                                padding: "10px 4px",
                                background: isCurrent
                                  ? "#eaf8ef"
                                  : isCompleted
                                  ? "#f4fbf6"
                                  : "#f8faf8",
                                border: isCurrent
                                  ? "2px solid #22c55e"
                                  : isCompleted
                                  ? "1px solid #86efac"
                                  : "1px solid #e5ebe6",
                                borderRadius: "10px",
                                transition: "all 0.3s ease"
                              }}
                            >
                              <span style={{ fontSize: "18px", display: "block", marginBottom: "4px" }}>
                                {s.icon}
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: isCompleted ? 700 : 500,
                                  color: isCompleted ? "#15803d" : "#708077"
                                }}
                              >
                                {s.label}
                              </span>
                              {isCurrent && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "10px",
                                    background: "#22c55e",
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    marginTop: "4px"
                                  }}
                                >
                                  Current Status
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "12px",
                        background: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "13px",
                        marginBottom: "16px"
                      }}
                    >
                      ❌ This order has been cancelled by the store.
                    </div>
                  )}

                  {/* Order Items Details */}
                  {o.items && o.items.length > 0 && (
                    <div style={{ marginTop: "14px", background: "#f8faf8", padding: "14px", borderRadius: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#183026", display: "block", marginBottom: "8px" }}>
                        🛒 Ordered Items ({o.items.length})
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {o.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "13px",
                              color: "#374151"
                            }}
                          >
                            <span>
                              {item.name} × <strong>{item.qty}</strong>
                            </span>
                            <span>₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {o.address && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "#567064" }}>
                      <strong>Delivery Address:</strong> {o.address}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

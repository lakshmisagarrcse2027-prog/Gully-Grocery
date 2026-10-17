"use client";
import { useState } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import { useLanguage } from "../../components/LanguageContext";

export default function CustomerLogin() {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCustomerAuth(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const targetEndpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload =
      mode === "register"
        ? { name: name.trim(), email: email.trim(), password, role: "customer" }
        : { email: email.trim(), password, expectedRole: "customer" };

    try {
      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await res.json();

      if (!res.ok) {
        setMsg(d.error || "Authentication failed. Please verify your details.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", d.token);
      localStorage.setItem("user", JSON.stringify(d.user));
      location.href = "/";
    } catch (err) {
      setMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fillCustomerDemo = () => {
    setMode("login");
    setEmail("customer@smartgrocer.local");
    setPassword("Customer@123");
    setMsg("Filled demo customer credentials!");
  };

  return (
    <>
      <Nav />
      <div className="auth-wrapper">
        <div className="auth" style={{ maxWidth: "880px", margin: "30px auto" }}>
          <form onSubmit={handleCustomerAuth} style={{ padding: "40px" }}>
            <div className="form-header" style={{ marginBottom: "20px" }}>
              <span
                style={{
                  background: "#eaf6ee",
                  color: "#176b45",
                  fontWeight: 800,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  display: "inline-block",
                  marginBottom: "8px"
                }}
              >
                👤 CUSTOMER PORTAL
              </span>
              <h2 style={{ margin: "6px 0", fontSize: "26px", color: "#183026" }}>
                {mode === "login" ? t("welcomeBack") || "Welcome Back, Customer" : t("createAccount") || "Create Customer Account"}
              </h2>
              <p style={{ color: "#567064", fontSize: "14px", margin: 0 }}>
                {mode === "login"
                  ? "Sign in to select your local store, track your orders, and enjoy fresh groceries."
                  : "Register as a customer to browse local store catalogs, order pickup or delivery, and receive real-time notifications."}
              </p>
            </div>

            {mode === "register" && (
              <>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Full Name *</label>
                <input
                  type="text"
                  placeholder={t("fullNamePlaceholder") || "e.g. Rahul Sharma"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </>
            )}

            <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Email Address *</label>
            <input
              type="email"
              placeholder={t("emailPlaceholder") || "yourname@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Password *</label>
            <div className="password-input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordPlaceholder") || "Minimum 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈 Unsee" : "👁️ See"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#176b45",
                fontSize: "15px",
                padding: "13px",
                marginTop: "10px"
              }}
            >
              {loading
                ? t("pleaseWait") || "Processing..."
                : mode === "login"
                ? `${t("loginBtn") || "Sign In"} →`
                : `${t("registerBtn") || "Register"} →`}
            </button>

            {msg && (
              <p
                style={{
                  color: msg.includes("Filled") ? "#176b45" : "#b52b2b",
                  fontWeight: 600,
                  fontSize: "13px",
                  marginTop: "12px"
                }}
              >
                {msg}
              </p>
            )}

            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="linkbtn"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setMsg("");
                }}
                style={{ textAlign: "left", padding: 0 }}
              >
                {mode === "login"
                  ? t("newCustomer") || "➕ New customer? Click here to create an account"
                  : t("alreadyRegistered") || "🔑 Already registered? Click here to sign in"}
              </button>

              <hr style={{ border: "none", borderTop: "1px solid #e2ece5", margin: "10px 0" }} />

              <Link
                href="/owner/login"
                style={{
                  fontSize: "13px",
                  color: "#92400e",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                🏪 Are you a Store Owner? Access Store Owner Portal →
              </Link>
            </div>
          </form>

          <aside style={{ padding: "40px", background: "#eaf6ee", borderLeft: "1px solid #d4e3d8" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#176b45", fontSize: "18px" }}>🛒 Customer Benefits</h3>
            <ul style={{ paddingLeft: "18px", color: "#183026", fontSize: "13px", lineHeight: 1.8 }}>
              <li><strong>Select Local Store:</strong> Choose any registered grocery store in your area.</li>
              <li><strong>Live Order Tracking:</strong> Track order progress from Order Placed to Delivery.</li>
              <li><strong>Instant Notifications:</strong> Get alerted the moment the store owner updates your order.</li>
              <li><strong>Multiple Payment Options:</strong> UPI (QR & VPA), Cash on Delivery, or Pay at Store.</li>
            </ul>

            <div style={{ marginTop: "24px", padding: "14px", background: "white", borderRadius: "10px", border: "1px solid #cbe3d3" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#176b45" }}>⚡ Quick Demo Login</h4>
              <code style={{ display: "block", fontSize: "12px", background: "#f2f8f4", padding: "4px 8px", borderRadius: "4px", marginBottom: "4px" }}>
                customer@smartgrocer.local
              </code>
              <code style={{ display: "block", fontSize: "12px", background: "#f2f8f4", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px" }}>
                Customer@123
              </code>
              <button
                type="button"
                onClick={fillCustomerDemo}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  background: "#176b45",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Auto-fill Customer Demo
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

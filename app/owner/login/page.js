"use client";
import { useState } from "react";
import Link from "next/link";
import Nav from "../../../components/Nav";

export default function OwnerLogin() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    if (mode === "register" && (!storeName || !storeName.trim())) {
      setMsg("Store name is required to register as a Store Owner.");
      setLoading(false);
      return;
    }

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload =
      mode === "register"
        ? { name, email, password, role: "owner", storeName: storeName.trim() }
        : { email, password, expectedRole: "owner" };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Server error (${res.status}). Please check server logs or try again.` };
      }

      if (!res.ok) {
        setMsg(data.error || "Authentication failed. Please verify your credentials.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.store_name) {
        localStorage.setItem("selectedStore", data.user.store_name);
      }
      location.href = "/owner";
    } catch (err) {
      setMsg("Connection error. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoOwner = () => {
    setMode("login");
    setEmail("owner@smartgrocer.local");
    setPassword("Owner@123");
    setMsg("Filled default Store Owner demo credentials!");
  };

  return (
    <>
      <Nav />
      <div className="auth-wrapper">
        <div className="auth" style={{ maxWidth: "880px", margin: "30px auto" }}>
          <form onSubmit={handleSubmit} style={{ padding: "40px" }}>
            <div className="form-header" style={{ marginBottom: "20px" }}>
              <span
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  fontWeight: 800,
                  fontSize: "12px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  display: "inline-block",
                  marginBottom: "8px"
                }}
              >
                🏪 STORE OWNER PORTAL
              </span>
              <h2 style={{ margin: "6px 0", fontSize: "26px", color: "#183026" }}>
                {mode === "login" ? "Store Owner Sign In" : "Register Your Grocery Store"}
              </h2>
              <p style={{ color: "#567064", fontSize: "14px", margin: 0 }}>
                {mode === "login"
                  ? "Access your store catalog, update product prices, and manage incoming customer orders."
                  : "Register your grocery store to start listing products, managing inventory, and fulfilling local customer orders."}
              </p>
            </div>

            {mode === "register" && (
              <>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Owner Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Store Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Daily Supermarket"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
                <p style={{ fontSize: "11px", color: "#176b45", margin: "-12px 0 14px 0", fontWeight: 600 }}>
                  💡 Customers will see and select this store name in the store selector.
                </p>
              </>
            )}

            <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Owner Email Address *</label>
            <input
              type="email"
              placeholder="owner@yourstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>Password *</label>
            <div className="password-input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
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
                background: "linear-gradient(135deg, #176b45, #0f492e)",
                fontSize: "15px",
                padding: "13px",
                marginTop: "10px"
              }}
            >
              {loading
                ? "Processing..."
                : mode === "login"
                ? "Sign In to Owner Dashboard 🔑"
                : "Register Store & Open Portal 🏪"}
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
                  ? "➕ New Store Owner? Click here to register your store"
                  : "🔑 Already registered your store? Click here to sign in"}
              </button>

              <hr style={{ border: "none", borderTop: "1px solid #e2ece5", margin: "10px 0" }} />

              <Link
                href="/login"
                style={{ fontSize: "13px", color: "#176b45", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                👤 Are you a Customer? Switch to Customer Login →
              </Link>
            </div>
          </form>

          <aside style={{ padding: "40px", background: "#fdf8ee", borderLeft: "1px solid #fae8c8" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#92400e", fontSize: "18px" }}>🏪 Owner Portal Features</h3>
            <ul style={{ paddingLeft: "18px", color: "#78350f", fontSize: "13px", lineHeight: 1.8 }}>
              <li><strong>Register Store Name:</strong> Your registered store name appears directly for customers to select.</li>
              <li><strong>Inventory & Price Updates:</strong> Edit prices and stock with one-click instant updates.</li>
              <li><strong>Add Custom Products:</strong> Add groceries specific to your store.</li>
              <li><strong>Fulfill Orders:</strong> Update order status in real time to notify customers.</li>
            </ul>

            <div style={{ marginTop: "24px", padding: "14px", background: "white", borderRadius: "10px", border: "1px solid #fde68a" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#92400e" }}>⚡ Quick Demo Login</h4>
              <code style={{ display: "block", fontSize: "12px", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px", marginBottom: "4px" }}>
                owner@smartgrocer.local
              </code>
              <code style={{ display: "block", fontSize: "12px", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px" }}>
                Owner@123
              </code>
              <button
                type="button"
                onClick={fillDemoOwner}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  background: "#92400e",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Auto-fill Owner Demo
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

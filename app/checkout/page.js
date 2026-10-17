"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import { useLanguage } from "../../components/LanguageContext";

export default function Checkout() {
  const { t } = useLanguage();
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [deliveryType, setDeliveryType] = useState("Store Pickup");
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [upiSubTab, setUpiSubTab] = useState("qr"); // "qr", "vpa", "apps"
  const [vpaInput, setVpaInput] = useState("");
  const [vpaError, setVpaError] = useState("");
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [upiVerified, setUpiVerified] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [qrSvg, setQrSvg] = useState("");

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem("cart") || "[]");
      setCart(items);
    } catch {
      setCart([]);
    }
  }, []);

  const subtotal = cart.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
  const deliveryFee = deliveryType === "Home Delivery" ? 30 : 0;
  const total = subtotal + deliveryFee;

  // Generate dynamic QR code whenever total or store changes
  useEffect(() => {
    if (paymentMethod === "UPI" && total > 0) {
      import("qrcode")
        .then((QRCode) => {
          const storeName = localStorage.getItem("selectedStore") || "SmartGrocer";
          const upiUri = `upi://pay?pa=smartgrocer@upi&pn=${encodeURIComponent(
            storeName
          )}&am=${total}&cu=INR&tn=OrderPayment`;

          QRCode.toString(upiUri, { type: "svg", margin: 1, width: 170 }, (err, svg) => {
            if (!err && svg) {
              setQrSvg(svg);
            }
          });
        })
        .catch((err) => {
          console.error("Failed to load QRCode module:", err);
        });
    }
  }, [paymentMethod, total]);

  // Handle UPI Verification
  const verifyUpiPayment = (customUtr) => {
    setUpiVerifying(true);
    setVpaError("");

    setTimeout(() => {
      const generatedUtr = customUtr || "UPI" + Math.floor(100000000000 + Math.random() * 900000000000);
      setUtrNumber(generatedUtr);
      setUpiVerified(true);
      setUpiVerifying(false);
    }, 1000);
  };

  const handleVpaSubmit = (e) => {
    e.preventDefault();
    if (!vpaInput.trim() || !vpaInput.includes("@")) {
      setVpaError("Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)");
      return;
    }
    verifyUpiPayment();
  };

  async function place(e) {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    let token = localStorage.getItem("token");
    if (!token) {
      location.href = "/login";
      return;
    }

    let items = [];
    try {
      items = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      items = [];
    }

    if (!items || items.length === 0) {
      setErrorMsg("Your cart is empty. Please add items before checking out.");
      return;
    }

    let f = Object.fromEntries(new FormData(e.currentTarget));
    let storeName = localStorage.getItem("selectedStore") || "SmartGrocer Central";
    let orderTotal =
      items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0) +
      (f.deliveryType === "Home Delivery" ? 30 : 0);

    // Build final payment method string
    let finalPayment = paymentMethod;
    if (paymentMethod === "UPI") {
      const activeUtr = utrNumber || "UPI" + Math.floor(100000000000 + Math.random() * 900000000000);
      finalPayment = `UPI (Paid • UTR: ${activeUtr})`;
    }

    setLoading(true);
    try {
      let r = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          ...f,
          paymentMethod: finalPayment,
          items,
          total: orderTotal,
          storeName
        })
      });

      let d = {};
      try {
        d = await r.json();
      } catch (jsonErr) {
        throw new Error("Unable to parse server response.");
      }

      if (!r.ok) {
        setErrorMsg(d?.error || "Failed to place order.");
        setLoading(false);
        return;
      }

      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartchange"));
      setCart([]);
      setMsg((t("orderSuccessMsg") || "Order #{id} placed successfully!").replace("{id}", d.orderId));
    } catch (err) {
      setErrorMsg(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main>
        <div className="checkout">
          <form onSubmit={place}>
            <h1>{t("checkoutTitle")}</h1>
            
            <label>{t("deliveryMethod")}</label>
            <select
              name="deliveryType"
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
            >
              <option value="Store Pickup">{t("storePickup")}</option>
              <option value="Home Delivery">{t("homeDelivery")}</option>
            </select>

            <label>{t("addressLabel")}</label>
            <textarea
              name="address"
              placeholder={t("addressPlaceholder")}
              required={deliveryType === "Home Delivery"}
            />

            <label>{t("paymentLabel")}</label>
            <select
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setUpiVerified(false);
              }}
            >
              <option value="Cash on Delivery">{t("cod")}</option>
              <option value="Pay at Store">{t("payAtStore")}</option>
              <option value="UPI">⚡ UPI (Google Pay, PhonePe, Paytm, QR)</option>
            </select>

            {/* INTERACTIVE UPI PAYMENT BOX */}
            {paymentMethod === "UPI" && (
              <div className="upi-section">
                <div className="upi-header">
                  <h4>⚡ Pay via UPI</h4>
                  <span className="upi-amount-badge">₹{total}</span>
                </div>

                {upiVerified ? (
                  <div className="upi-verified-card">
                    <div className="upi-verified-title">
                      <span>✓</span> UPI Payment Verified
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#166534" }}>
                      Received ₹{total} for your SmartGrocer order.
                    </p>
                    <div className="upi-utr-badge">Ref: {utrNumber}</div>
                  </div>
                ) : (
                  <>
                    <div className="upi-subtabs">
                      <button
                        type="button"
                        className={`upi-tab-btn ${upiSubTab === "qr" ? "active" : ""}`}
                        onClick={() => setUpiSubTab("qr")}
                      >
                        📱 Scan QR
                      </button>
                      <button
                        type="button"
                        className={`upi-tab-btn ${upiSubTab === "vpa" ? "active" : ""}`}
                        onClick={() => setUpiSubTab("vpa")}
                      >
                        💳 Enter UPI ID
                      </button>
                      <button
                        type="button"
                        className={`upi-tab-btn ${upiSubTab === "apps" ? "active" : ""}`}
                        onClick={() => setUpiSubTab("apps")}
                      >
                        📲 UPI Apps
                      </button>
                    </div>

                    {/* Subtab 1: Dynamic QR Code */}
                    {upiSubTab === "qr" && (
                      <div className="upi-qr-card">
                        <div className="upi-qr-frame">
                          {qrSvg ? (
                            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                          ) : (
                            <div style={{ width: 170, height: 170, display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}>
                              Generating QR...
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#567064", fontWeight: 600 }}>
                          Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)
                        </div>
                        <div className="upi-badges">
                          <span className="upi-app-chip">Google Pay</span>
                          <span className="upi-app-chip">PhonePe</span>
                          <span className="upi-app-chip">Paytm</span>
                          <span className="upi-app-chip">BHIM</span>
                          <span className="upi-app-chip">Cred</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "6px" }}>
                          <a
                            href={`upi://pay?pa=smartgrocer@upi&pn=SmartGrocer&am=${total}&cu=INR&tn=OrderPayment`}
                            className="upi-action-btn"
                            style={{
                              flex: 1,
                              background: "#eaf6ee",
                              color: "#176b45",
                              border: "1px solid #cbe3d3",
                              textAlign: "center",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-block"
                            }}
                          >
                            📲 Open in App
                          </a>
                          <button
                            type="button"
                            className="upi-action-btn"
                            onClick={() => verifyUpiPayment()}
                            disabled={upiVerifying}
                            style={{ flex: 1 }}
                          >
                            {upiVerifying ? "Verifying..." : "✓ I Have Paid"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subtab 2: VPA Input */}
                    {upiSubTab === "vpa" && (
                      <div className="upi-vpa-card">
                        <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026" }}>
                          Enter your Virtual Payment Address (UPI ID)
                        </label>
                        <div className="upi-vpa-input-group">
                          <input
                            type="text"
                            placeholder="e.g. mobile@paytm or name@okhdfcbank"
                            value={vpaInput}
                            onChange={(e) => {
                              setVpaInput(e.target.value);
                              setVpaError("");
                            }}
                          />
                          <button
                            type="button"
                            className="upi-action-btn"
                            onClick={handleVpaSubmit}
                            disabled={upiVerifying}
                          >
                            {upiVerifying ? "Verifying..." : "Request & Pay"}
                          </button>
                        </div>
                        {vpaError && (
                          <p style={{ color: "#b52b2b", fontSize: "12px", margin: "6px 0 0" }}>{vpaError}</p>
                        )}
                        <p style={{ fontSize: "12px", color: "#567064", margin: "8px 0 0" }}>
                          A collect request of ₹{total} will be approved for demo checkout.
                        </p>
                      </div>
                    )}

                    {/* Subtab 3: Popular UPI Apps */}
                    {upiSubTab === "apps" && (
                      <div className="upi-vpa-card">
                        <label style={{ fontSize: "13px", fontWeight: 700, color: "#183026", marginBottom: "8px", display: "block" }}>
                          Select your preferred UPI app
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {[
                            { name: "Google Pay", icon: "🟢" },
                            { name: "PhonePe", icon: "🟣" },
                            { name: "Paytm", icon: "🔵" },
                            { name: "BHIM UPI", icon: "🟠" }
                          ].map((app) => (
                            <button
                              key={app.name}
                              type="button"
                              onClick={() => verifyUpiPayment()}
                              disabled={upiVerifying}
                              style={{
                                padding: "10px",
                                background: "white",
                                border: "1px solid #d4e3d8",
                                color: "#183026",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              <span>{app.icon}</span>
                              <span>{app.name}</span>
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: "12px", color: "#567064", marginTop: "10px" }}>
                          Click any app to simulate instant UPI approval.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button disabled={loading || (cart.length === 0 && !msg)}>
              {loading
                ? (t("pleaseWait") || "Placing order...")
                : paymentMethod === "UPI" && upiVerified
                ? "Place Order (Paid via UPI) →"
                : t("placeOrderBtn")}
            </button>

            {errorMsg && <p className="error" style={{ marginTop: "12px" }}>{errorMsg}</p>}
            
            {msg && (
              <div style={{ marginTop: "16px" }}>
                <p className="success">{msg}</p>
                <Link href="/" style={{ display: "inline-block", marginTop: "10px", color: "#176b45", fontWeight: "bold" }}>
                  ← {t("cartBrowseBtn") || "Continue Shopping"}
                </Link>
              </div>
            )}
          </form>

          <aside>
            <h2>{t("asideTitle")}</h2>
            <div style={{ margin: "16px 0", padding: "14px", background: "white", borderRadius: "10px", border: "1px solid #dce8df" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Subtotal ({cart.length} {cart.length === 1 ? "item" : "items"}):</span>
                <b>₹{subtotal}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Delivery ({deliveryType}):</span>
                <span>{deliveryType === "Home Delivery" ? "₹30" : "Free"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Payment:</span>
                <span style={{ fontWeight: 600 }}>{paymentMethod}</span>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                <b>Total:</b>
                <b style={{ color: "#176b45" }}>₹{total}</b>
              </div>
            </div>
            <p>{t("asideLoginNotice")}</p>
            <p>{t("asideUpiNotice")}</p>
          </aside>
        </div>
      </main>
    </>
  );
}

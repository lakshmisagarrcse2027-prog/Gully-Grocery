"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageContext";

export default function Nav() {
  const { lang, setLang, t, languages, currentLanguage } = useLanguage();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [stores, setStores] = useState([{ id: 1, name: "SmartGrocer Central" }]);
  const [selectedStore, setSelectedStore] = useState("SmartGrocer Central");
  const [notification, setNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const count = cart.reduce((total, item) => total + (item.qty || 1), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  const loadStores = () => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => {
        if (d.stores && d.stores.length > 0) {
          setStores(d.stores);
          const savedStore = localStorage.getItem("selectedStore");
          if (savedStore && d.stores.some((s) => s.name === savedStore)) {
            setSelectedStore(savedStore);
          } else {
            setSelectedStore(d.stores[0].name);
            localStorage.setItem("selectedStore", d.stores[0].name);
          }
        }
      })
      .catch(() => {});
  };

  // Poll for customer order updates to trigger live notifications
  const checkOrderUpdates = () => {
    const token = localStorage.getItem("token");
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !u || u.role !== "customer") return;

    fetch("/api/orders", {
      headers: { Authorization: "Bearer " + token }
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.orders) return;

        let knownStatuses = {};
        try {
          knownStatuses = JSON.parse(localStorage.getItem("customer_order_statuses") || "{}");
        } catch {}

        let newUpdates = 0;
        let latestUpdateMsg = null;

        d.orders.forEach((o) => {
          const prevStatus = knownStatuses[o.id];
          if (prevStatus && prevStatus !== o.status) {
            newUpdates++;
            latestUpdateMsg = {
              orderId: o.id,
              status: o.status,
              storeName: o.store_name || "Store"
            };
          }
        });

        if (latestUpdateMsg) {
          setNotification(latestUpdateMsg);
          setUnreadCount((prev) => prev + 1);

          // Update known statuses
          const updatedMap = { ...knownStatuses };
          d.orders.forEach((o) => {
            updatedMap[o.id] = o.status;
          });
          localStorage.setItem("customer_order_statuses", JSON.stringify(updatedMap));

          // Auto-hide toast after 7 seconds
          setTimeout(() => setNotification(null), 7000);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user")));
    } catch {}

    const savedStore = localStorage.getItem("selectedStore");
    if (savedStore) setSelectedStore(savedStore);

    loadStores();
    updateCartCount();

    window.addEventListener("cartchange", updateCartCount);
    window.addEventListener("orderstatusseen", () => setUnreadCount(0));

    // Poll every 8s for live notifications
    const pollInterval = setInterval(checkOrderUpdates, 8000);

    return () => {
      window.removeEventListener("cartchange", updateCartCount);
      window.removeEventListener("orderstatusseen", () => setUnreadCount(0));
      clearInterval(pollInterval);
    };
  }, []);

  const handleStoreChange = (e) => {
    const newStore = e.target.value;
    setSelectedStore(newStore);
    localStorage.setItem("selectedStore", newStore);
    window.dispatchEvent(new CustomEvent("storechange", { detail: { storeName: newStore } }));
  };

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.href = "/";
  }

  return (
    <>
      {/* Floating Live Notification Toast */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            background: "#183026",
            color: "white",
            padding: "14px 20px",
            borderRadius: "14px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            maxWidth: "380px",
            borderLeft: "5px solid #22c55e",
            animation: "slideIn 0.3s ease"
          }}
        >
          <span style={{ fontSize: "24px" }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#86efac" }}>
              Order #{notification.orderId} Updated!
            </div>
            <div style={{ fontSize: "12px", color: "#e5e7eb", marginTop: "2px" }}>
              Status is now: <strong>{notification.status}</strong> by {notification.storeName}
            </div>
            <Link
              href="/orders"
              style={{
                display: "inline-block",
                marginTop: "6px",
                fontSize: "12px",
                color: "#4ade80",
                fontWeight: 700,
                textDecoration: "underline"
              }}
              onClick={() => setNotification(null)}
            >
              Track Order Live →
            </Link>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: "16px",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            ✕
          </button>
        </div>
      )}

      <nav>
        <Link className="logo" href="/">
          🛒 <span>{t("brandName")}</span>
        </Link>

        <div className="links">
          {/* Store Selector Dropdown */}
          <div className="store-selector" title="Select Store registered by Owner">
            <span>🏪</span>
            <select value={selectedStore} onChange={handleStoreChange} aria-label="Select Store">
              {stores.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Link href="/">{t("navShop")}</Link>

          <Link href="/cart">
            {t("navCart")}{" "}
            {cartCount > 0 && (
              <span
                style={{
                  background: "#176b45",
                  color: "white",
                  borderRadius: "10px",
                  padding: "2px 7px",
                  fontSize: "12px",
                  marginLeft: "4px"
                }}
              >
                {cartCount}
              </span>
            )}
          </Link>

          {/* Customer Orders with Notification Badge */}
          {user && user.role !== "owner" && (
            <Link
              href="/orders"
              style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span>📦 My Orders</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "10px",
                    padding: "2px 6px",
                    fontSize: "11px",
                    fontWeight: 800
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Owner Dashboard Link */}
          {user?.role === "owner" && (
            <Link
              href="/owner"
              style={{
                background: "#fef3c7",
                color: "#92400e",
                padding: "6px 12px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "13px"
              }}
            >
              🏪 Owner Portal
            </Link>
          )}

          {/* Language Switcher Dropdown */}
          <div className="lang-selector">
            <span>{currentLanguage.flag}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Select Language">
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <>
              <span style={{ fontSize: "13px" }}>
                {t("navHi")}, <strong>{user.name}</strong>
                {user.role === "owner" && (
                  <span style={{ fontSize: "11px", color: "#92400e", marginLeft: "4px" }}>
                    (Owner)
                  </span>
                )}
              </span>
              <button className="ghost" onClick={logout}>
                {t("navLogout")}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                href="/login"
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "#176b45",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700
                }}
              >
                👤 Customer Login
              </Link>
              <Link
                href="/owner/login"
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  fontSize: "13px",
                  fontWeight: 700
                }}
              >
                🏪 Store Owner
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

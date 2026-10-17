"use client";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { useLanguage } from "../../components/LanguageContext";

export default function Cart() {
  const { t, tProductName, tProductUnit } = useLanguage();
  const [c, setC] = useState([]);
  useEffect(() => setC(JSON.parse(localStorage.getItem("cart") || "[]")), []);

  function save(n) {
    setC(n);
    localStorage.setItem("cart", JSON.stringify(n));
    window.dispatchEvent(new Event("cartchange"));
  }

  function qty(id, d) {
    save(c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + d) } : x)));
  }

  let total = c.reduce((s, x) => s + x.price * x.qty, 0);

  return (
    <>
      <Nav />
      <main>
        <h1>{t("cartTitle")}</h1>
        {!c.length ? (
          <div className="empty">
            <h2>{t("cartEmptyTitle")}</h2>
            <a href="/">
              <button>{t("cartBrowseBtn")}</button>
            </a>
          </div>
        ) : (
          <>
            <div className="cart">
              {c.map((x) => (
                <div className="cartitem" key={x.id}>
                  <div>
                    <b>{tProductName(x.name)}</b>
                    <p>
                      ₹{x.price} / {tProductUnit(x.unit)}
                    </p>
                  </div>
                  <div className="qty">
                    <button onClick={() => qty(x.id, -1)}>−</button>
                    {x.qty}
                    <button onClick={() => qty(x.id, 1)}>+</button>
                  </div>
                  <b>₹{x.price * x.qty}</b>
                  <button className="remove" onClick={() => save(c.filter((y) => y.id !== x.id))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="summary">
              <span>{t("cartTotal")}</span>
              <strong>₹{total}</strong>
              <a href="/checkout">
                <button>{t("cartProceedBtn")}</button>
              </a>
            </div>
          </>
        )}
      </main>
    </>
  );
}

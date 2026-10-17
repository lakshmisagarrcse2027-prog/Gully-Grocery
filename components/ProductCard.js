"use client";
import { useState } from "react";
import { useLanguage } from "./LanguageContext";

export default function ProductCard({ p }) {
  const { t, tCategory, tProductName, tProductUnit } = useLanguage();
  const [added, setAdded] = useState(false);

  function add() {
    let c = JSON.parse(localStorage.getItem("cart") || "[]"),
      x = c.find((i) => i.id === p.id);
    x ? x.qty++ : c.push({ ...p, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(c));
    window.dispatchEvent(new Event("cartchange"));

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="card">
      <div className="card-body">
        <span className="tag">{tCategory(p.category)}</span>
        <h3>{tProductName(p.name)}</h3>
        <p className="muted">
          {t("inStock")} • {tProductUnit(p.unit)}
        </p>
      </div>
      <div className="cardfoot">
        <b>₹{p.price}</b>
        <button onClick={add} style={added ? { background: "#0e4c30" } : {}}>
          {added ? t("addedBtn") : t("addBtn")}
        </button>
      </div>
    </article>
  );
}

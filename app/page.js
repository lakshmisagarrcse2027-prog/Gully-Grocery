"use client";
import { useState, useEffect } from "react";
import Nav from "../components/Nav";
import ProductCard from "../components/ProductCard";
import { products as fallbackProducts } from "../lib/products";
import { useLanguage } from "../components/LanguageContext";

export default function Home() {
  const { t, tCategory, tProductName } = useLanguage();
  const [productList, setProductList] = useState(fallbackProducts);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [currentStore, setCurrentStore] = useState("SmartGrocer Central");

  const loadStoreProducts = (targetStore) => {
    const activeStore = targetStore || localStorage.getItem("selectedStore") || "SmartGrocer Central";
    setCurrentStore(activeStore);

    fetch("/api/products?store_name=" + encodeURIComponent(activeStore))
      .then((r) => r.json())
      .then((d) => {
        if (d.products) {
          setProductList(d.products);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStoreProducts();

    const handleStoreChange = (e) => {
      const newStore = e.detail?.storeName || localStorage.getItem("selectedStore");
      loadStoreProducts(newStore);
    };

    window.addEventListener("storechange", handleStoreChange);
    return () => window.removeEventListener("storechange", handleStoreChange);
  }, []);

  const categories = ["All", ...new Set(productList.map((p) => p.category))];

  let list = productList.filter((p) => {
    const matchesCategory = cat === "All" || p.category === cat;
    const query = q.toLowerCase().trim();
    if (!query) return matchesCategory;

    const engName = p.name.toLowerCase();
    const transName = tProductName(p.name).toLowerCase();
    const matchesSearch = engName.includes(query) || transName.includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Nav />
      <header className="hero">
        <div>
          <span className="eyebrow">🏪 Store: {currentStore}</span>
          <h1>
            {t("heroHeadline").split("&")[0]}
            {t("heroHeadline").includes("&") && <><br />& {t("heroHeadline").split("&")[1]}</>}
          </h1>
          <p>{t("heroSubhead")}</p>
          <a href="#shop">
            <button>{t("heroStartBtn")}</button>
          </a>
        </div>
        <div className="herofeatures">
          <div className="feature-card">
            <span className="feat-icon">⚡</span>
            <div>
              <h4>Express Delivery</h4>
              <p>Under 30 mins to your doorstep</p>
            </div>
          </div>
          <div className="feature-card">
            <span className="feat-icon">🌾</span>
            <div>
              <h4>Fresh Local Quality</h4>
              <p>Direct from verified local stores</p>
            </div>
          </div>
          <div className="feature-card">
            <span className="feat-icon">🏷️</span>
            <div>
              <h4>Best Daily Prices</h4>
              <p>Transparent rates & discounts</p>
            </div>
          </div>
        </div>
      </header>

      <main id="shop">
        <div className="shophead">
          <div>
            <h2>{t("shopTitle")}</h2>
            <p className="muted">
              {list.length} {t("itemsAvailable")}
            </p>
          </div>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </div>

        <div className="cats">
          {categories.map((c) => (
            <button
              className={cat === c ? "active" : ""}
              onClick={() => setCat(c)}
              key={c}
            >
              {tCategory(c)}
            </button>
          ))}
        </div>

        <div className="grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </main>

      <footer>SmartGrocer • Local shopping without paper lists</footer>
    </>
  );
}


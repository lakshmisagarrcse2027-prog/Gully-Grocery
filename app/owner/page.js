"use client";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { useLanguage } from "../../components/LanguageContext";

export default function Owner() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "add-product" | "orders"
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [err, setErr] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  // New product form state
  const [newProd, setNewProd] = useState({
    name: "",
    category: "Rice & Grains",
    price: "",
    unit: "kg",
    image: "",
    stock: "50"
  });

  // Track editable inputs for each product ID
  const [editingProds, setEditingProds] = useState({});

  const [storeName, setStoreName] = useState("SmartGrocer Central");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: "Bearer " + (localStorage.getItem("token") || "")
  });

  const loadData = (sName) => {
    const currentStore = sName || storeName || "SmartGrocer Central";

    // Load Orders
    fetch("/api/orders", { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => { });

    // Load Products (all products including hidden ones for owner's store view)
    fetch("/api/products?all=true&store_name=" + encodeURIComponent(currentStore))
      .then((r) => r.json())
      .then((d) => {
        if (d.products) {
          setProductsList(d.products);
          const initialEdits = {};
          d.products.forEach((p) => {
            initialEdits[p.id] = { price: p.price, stock: p.stock };
          });
          setEditingProds(initialEdits);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    let u = JSON.parse(localStorage.getItem("user") || "null");
    if (u?.role !== "owner") {
      setErr(t("ownerLoginRequired") || "Store Owner login required to access this portal.");
      return;
    }
    const myStore = u.store_name || "SmartGrocer Central";
    setStoreName(myStore);
    loadData(myStore);
  }, []);

  const handleEditChange = (id, field, value) => {
    setEditingProds((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const saveProductUpdate = async (product) => {
    const edit = editingProds[product.id];
    if (!edit) return;

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          id: product.id,
          price: parseFloat(edit.price),
          stock: parseInt(edit.stock, 10)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`Updated ${product.name}: Price ₹${edit.price}, Stock ${edit.stock}`);
        setTimeout(() => setFeedbackMsg(""), 4000);
        loadData();
      } else {
        alert(data.error || "Failed to update product");
      }
    } catch (e) {
      alert("Error updating product");
    }
  };

  const deleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}" from inventory?`)) return;

    try {
      const res = await fetch(`/api/products?id=${product.id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        setFeedbackMsg(`Deleted ${product.name} from inventory.`);
        setTimeout(() => setFeedbackMsg(""), 4000);
        loadData();
      } else {
        alert("Failed to delete product");
      }
    } catch (e) {
      alert("Error deleting product");
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.unit) {
      alert("Please fill in Name, Price, and Unit.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newProd)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`✨ Successfully added product "${data.product.name}" to inventory!`);
        setNewProd({
          name: "",
          category: "Rice & Grains",
          price: "",
          unit: "kg",
          image: "",
          stock: "50"
        });
        setActiveTab("inventory");
        setTimeout(() => setFeedbackMsg(""), 4000);
        loadData();
      } else {
        alert(data.error || "Failed to add product.");
      }
    } catch (e) {
      alert("Error adding product.");
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        setFeedbackMsg(`Updated Order #${orderId} status to "${newStatus}"`);
        setTimeout(() => setFeedbackMsg(""), 4000);
        loadData();
      }
    } catch (e) { }
  };

  const categories = ["All", ...new Set(productsList.map((p) => p.category))];
  const filteredProducts = productsList.filter((p) => {
    const matchCat = selectedCat === "All" || p.category === selectedCat;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCat && matchSearch;
  });

  const totalSales = orders.reduce((s, x) => s + x.total, 0);
  const pendingOrdersCount = orders.filter((x) => x.status !== "Delivered" && x.status !== "Cancelled").length;

  return (
    <>
      <Nav />
      <main className="owner-main">
        <div className="owner-header">
          <div>
            <h1>🏪 Store Owner Portal &mdash; <span className="highlight-store">{storeName}</span></h1>
            <p className="muted">Managing inventory, pricing, stock, visibility, and orders for <strong>{storeName}</strong>.</p>
          </div>
          <span className="owner-badge">Logged in as Owner of {storeName}</span>
        </div>

        {err ? (
          <div className="empty">
            {err}
            <br />
            <br />
            <a href="/owner/login">
              <button>Go to Store Owner Portal</button>
            </a>
          </div>
        ) : (
          <>
            {feedbackMsg && <div className="owner-alert success">{feedbackMsg}</div>}

            {/* Stats Dashboard */}
            <div className="stats owner-stats">
              <div>
                <span>Total Orders</span>
                <b>{orders.length}</b>
              </div>
              <div>
                <span>Total Sales Revenue</span>
                <b>₹{totalSales}</b>
              </div>
              <div>
                <span>Pending Orders</span>
                <b>{pendingOrdersCount}</b>
              </div>
              <div>
                <span>Inventory Items</span>
                <b>{productsList.length}</b>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="owner-nav-tabs">
              <button
                className={`owner-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
                onClick={() => setActiveTab("inventory")}
              >
                📦 Manage Product Inventory ({productsList.length})
              </button>
              <button
                className={`owner-tab-btn ${activeTab === "add-product" ? "active" : ""}`}
                onClick={() => setActiveTab("add-product")}
              >
                ➕ Add New Product
              </button>
              <button
                className={`owner-tab-btn ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                📋 Customer Orders ({orders.length})
              </button>
            </div>

            {/* TAB 1: INVENTORY MANAGEMENT */}
            {activeTab === "inventory" && (
              <div className="owner-section">
                <div className="inventory-filter-bar">
                  <input
                    type="text"
                    placeholder="Search product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="cat-select"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inventory-table-container">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price (₹)</th>
                        <th>Unit</th>
                        <th>Stock Quantity</th>
                        <th>Stock Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const edit = editingProds[p.id] || { price: p.price, stock: p.stock };
                        const isModified = edit.price !== p.price || edit.stock !== p.stock;
                        const stockNum = parseInt(edit.stock, 10);

                        let stockBadgeClass = "in-stock";
                        let stockLabel = "In Stock";
                        if (stockNum === 0) {
                          stockBadgeClass = "out-of-stock";
                          stockLabel = "Out of Stock";
                        } else if (stockNum < 10) {
                          stockBadgeClass = "low-stock";
                          stockLabel = `Low (${stockNum})`;
                        }

                        return (
                          <tr key={p.id}>
                            <td className="font-bold">{p.name}</td>
                            <td>
                              <span className="cat-pill">{p.category}</span>
                            </td>
                            <td>
                              <div className="input-with-symbol">
                                <span>₹</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={edit.price}
                                  onChange={(e) => handleEditChange(p.id, "price", e.target.value)}
                                  className="table-input"
                                />
                              </div>
                            </td>
                            <td>{p.unit}</td>
                            <td>
                              <input
                                type="number"
                                value={edit.stock}
                                onChange={(e) => handleEditChange(p.id, "stock", e.target.value)}
                                className="table-input"
                              />
                            </td>
                            <td>
                              <span className={`stock-badge ${stockBadgeClass}`}>{stockLabel}</span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className={`action-save-btn ${isModified ? "highlight" : ""}`}
                                  onClick={() => saveProductUpdate(p)}
                                  title="Update product price and stock"
                                >
                                  💾 Update Price
                                </button>
                                <button
                                  className="action-delete-btn"
                                  onClick={() => deleteProduct(p)}
                                  title="Delete product"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: ADD NEW PRODUCT */}
            {activeTab === "add-product" && (
              <div className="owner-section add-product-card">
                <h2>➕ Add New Product to Store Catalog</h2>
                <form onSubmit={handleAddProductSubmit} className="add-product-form">
                  <div className="form-grid">
                    <div>
                      <label>Product Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Organic Alphonso Mangoes"
                        value={newProd.name}
                        onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label>Category *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rice & Grains, Spices, Dairy & Eggs"
                        value={newProd.category}
                        onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label>Price (₹) *</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 120"
                        value={newProd.price}
                        onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label>Unit *</label>
                      <select
                        value={newProd.unit}
                        onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                      >
                        <option value="kg">kg</option>
                        <option value="500 g">500 g</option>
                        <option value="250 g">250 g</option>
                        <option value="100 g">100 g</option>
                        <option value="L">L</option>
                        <option value="500 ml">500 ml</option>
                        <option value="pack">pack</option>
                        <option value="dozen">dozen</option>
                      </select>
                    </div>

                    <div>
                      <label>Stock Quantity *</label>
                      <input
                        type="number"
                        value={newProd.stock}
                        onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="add-submit-btn">
                    ➕ Add Product to Inventory
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: ORDERS MANAGEMENT */}
            {activeTab === "orders" && (
              <div className="owner-section">
                <h2>📋 Customer Orders</h2>
                <div className="table">
                  {orders.length ? (
                    orders.map((x) => (
                      <div className="order owner-order-card" key={x.id}>
                        <div className="order-id">#{x.id}</div>
                        <div className="order-user">
                          <strong>Customer:</strong> {x.customer}
                        </div>
                        <div className="order-type">
                          <strong>Type:</strong> {x.delivery_type}
                        </div>
                        <div className="order-payment">
                          <strong>Payment:</strong> {x.payment_method}
                        </div>
                        <div className="order-total">
                          <strong>₹{x.total}</strong>
                        </div>
                        <div className="order-status-select">
                          <select
                            value={x.status}
                            onChange={(e) => handleOrderStatusChange(x.id, e.target.value)}
                            className={`status-select ${x.status.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <option value="Order Placed">Order Placed</option>
                            <option value="Processing">Processing</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>{t("noOrdersYet")}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}


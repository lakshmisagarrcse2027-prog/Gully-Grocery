import fs from "fs";
import path from "path";
import os from "os";
import bcrypt from "bcryptjs";
import { products as initialProducts } from "./products.js";

// Determine data file path:
// On Vercel / serverless runtimes, process.cwd() is read-only (/var/task), while os.tmpdir() (/tmp) is writable.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const localDataPath = path.resolve(process.cwd(), "smartgrocer.data.json");
const tmpDataPath = path.join(os.tmpdir(), "smartgrocer.data.json");
const dataPath = isServerless ? tmpDataPath : localDataPath;

function createInitialData() {
  const ownerHash = bcrypt.hashSync("Owner@123", 10);
  const custHash = bcrypt.hashSync("Customer@123", 10);

  const productsList = (initialProducts || []).map((p, idx) => ({
    id: p.id || idx + 1,
    name: p.name,
    category: p.category,
    price: Number(p.price) || 0,
    unit: p.unit || "unit",
    image: p.image || "",
    stock: p.stock !== undefined ? Number(p.stock) : 50,
    visible: 1,
    store_name: p.store_name || "SmartGrocer Central"
  }));

  const maxProdId = productsList.reduce((max, p) => Math.max(max, p.id || 0), 0);

  return {
    users: [
      {
        id: 1,
        name: "Store Owner",
        email: "owner@smartgrocer.local",
        password_hash: ownerHash,
        role: "owner",
        store_name: "SmartGrocer Central"
      },
      {
        id: 2,
        name: "Sample Customer",
        email: "customer@smartgrocer.local",
        password_hash: custHash,
        role: "customer",
        store_name: "SmartGrocer Central"
      }
    ],
    products: productsList,
    orders: [],
    order_items: [],
    nextUserId: 2,
    nextProdId: maxProdId,
    nextOrderId: 0,
    nextOrderItemId: 0
  };
}

let store = null;

function loadStore() {
  if (store) return store;

  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, "utf8");
      store = JSON.parse(raw);
    } else if (isServerless && fs.existsSync(localDataPath)) {
      const raw = fs.readFileSync(localDataPath, "utf8");
      store = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Notice: Loading existing store failed, seeding defaults:", err.message);
  }

  if (!store || !store.users || !store.products) {
    store = createInitialData();
    saveStore();
  }

  return store;
}

function saveStore() {
  if (!store) return;
  try {
    fs.writeFileSync(dataPath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    // Non-blocking fallback for read-only serverless filesystem
  }
}

function normalizeSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim().toLowerCase();
}

const db = {
  prepare(sql) {
    const norm = normalizeSql(sql);

    return {
      async get(...params) {
        const d = loadStore();

        // 1. SELECT * FROM users WHERE email=?
        if (norm.includes("from users") && norm.includes("email=?")) {
          const email = String(params[0] || "").trim().toLowerCase();
          const u = d.users.find(x => x.email.toLowerCase() === email);
          return u ? { ...u } : undefined;
        }

        // 2. SELECT id FROM users WHERE email=?
        if (norm.includes("select id from users") && norm.includes("email=?")) {
          const email = String(params[0] || "").trim().toLowerCase();
          const u = d.users.find(x => x.email.toLowerCase() === email);
          return u ? { id: u.id } : undefined;
        }

        // 3. SELECT store_name FROM users WHERE id = ?
        if (norm.includes("select store_name from users") && norm.includes("id = ?")) {
          const id = Number(params[0]);
          const u = d.users.find(x => x.id === id);
          return u ? { store_name: u.store_name } : undefined;
        }

        // 4. SELECT * FROM products WHERE id = ?
        if (norm.includes("from products") && norm.includes("id = ?")) {
          const id = Number(params[0]);
          const p = d.products.find(x => x.id === id);
          return p ? { ...p } : undefined;
        }

        // 5. SELECT COUNT(*) as cnt FROM products WHERE store_name = ?
        if (norm.includes("count(*) as cnt from products") && norm.includes("store_name = ?")) {
          const storeName = String(params[0] || "");
          const cnt = d.products.filter(p => (p.store_name || "SmartGrocer Central") === storeName).length;
          return { cnt };
        }

        return undefined;
      },

      async all(...params) {
        const d = loadStore();

        // 1. SELECT DISTINCT store_name FROM users WHERE role = 'owner' ...
        if (norm.includes("distinct store_name from users")) {
          const owners = d.users.filter(u => u.role === "owner" && u.store_name && u.store_name.trim());
          const names = [...new Set(owners.map(u => u.store_name.trim()))];
          if (!names.includes("SmartGrocer Central")) {
            names.unshift("SmartGrocer Central");
          }
          return names.map(store_name => ({ store_name }));
        }

        // 2. SELECT * FROM products ...
        if (norm.includes("from products")) {
          let list = [...d.products];

          const hasStoreParam = norm.includes("store_name = ?") || norm.includes("(store_name = ?");
          if (hasStoreParam && params[0]) {
            const storeName = String(params[0]);
            list = list.filter(p => !p.store_name || p.store_name === storeName || p.store_name === "SmartGrocer Central");
          } else if (norm.includes("store_name = 'smartgrocer central'")) {
            list = list.filter(p => !p.store_name || p.store_name === "SmartGrocer Central");
          }

          if (norm.includes("visible is null or visible = 1")) {
            list = list.filter(p => p.visible === 1 || p.visible === null || p.visible === undefined);
          }

          if (norm.includes("limit 30")) {
            list = list.slice(0, 30);
          }

          list.sort((a, b) => a.id - b.id);
          return list.map(p => ({ ...p }));
        }

        // 3. SELECT o.*, u.name customer FROM orders o JOIN users u ...
        if (norm.includes("from orders o join users u")) {
          const storeName = params[0] ? String(params[0]) : null;
          let list = [...d.orders];
          if (storeName) {
            list = list.filter(o => !o.store_name || o.store_name === storeName);
          }
          list.sort((a, b) => b.id - a.id);
          return list.map(o => {
            const user = d.users.find(u => u.id === o.user_id);
            return { ...o, customer: user?.name || "Customer" };
          });
        }

        // 4. SELECT * FROM orders WHERE user_id=? ORDER BY id DESC
        if (norm.includes("from orders where user_id=?")) {
          const userId = Number(params[0]);
          let list = d.orders.filter(o => o.user_id === userId);
          list.sort((a, b) => b.id - a.id);
          return list.map(o => ({ ...o }));
        }

        // 5. SELECT * FROM order_items WHERE order_id = ?
        if (norm.includes("from order_items where order_id = ?")) {
          const orderId = Number(params[0]);
          return d.order_items.filter(i => i.order_id === orderId).map(i => ({ ...i }));
        }

        return [];
      },

      async run(...params) {
        const d = loadStore();

        // 1. INSERT INTO users ...
        if (norm.includes("insert into users")) {
          d.nextUserId = (d.nextUserId || 0) + 1;
          const [name, email, password_hash, role, store_name] = params;
          const user = {
            id: d.nextUserId,
            name: String(name || "").trim(),
            email: String(email || "").trim().toLowerCase(),
            password_hash,
            role: role || "customer",
            store_name: store_name ? String(store_name).trim() : "SmartGrocer Central"
          };
          d.users.push(user);
          saveStore();
          return { lastInsertRowid: user.id, changes: 1 };
        }

        // 2. INSERT INTO products ...
        if (norm.includes("insert into products")) {
          d.nextProdId = (d.nextProdId || 0) + 1;
          let newProd;
          if (params.length === 9) {
            const [id, name, category, price, unit, image, stock, visible, store_name] = params;
            newProd = {
              id: Number(id) || d.nextProdId,
              name: String(name || ""),
              category: String(category || ""),
              price: Number(price) || 0,
              unit: String(unit || "unit"),
              image: image || "",
              stock: Number(stock) || 50,
              visible: Number(visible) !== 0 ? 1 : 0,
              store_name: store_name || "SmartGrocer Central"
            };
          } else {
            const [name, category, price, unit, image, stock, visible, store_name] = params;
            newProd = {
              id: d.nextProdId,
              name: String(name || "").trim(),
              category: String(category || "").trim(),
              price: Number(price) || 0,
              unit: String(unit || "unit").trim(),
              image: image ? String(image).trim() : "",
              stock: stock !== undefined ? Number(stock) : 50,
              visible: Number(visible) !== 0 ? 1 : 0,
              store_name: store_name ? String(store_name).trim() : "SmartGrocer Central"
            };
          }
          d.products.push(newProd);
          saveStore();
          return { lastInsertRowid: newProd.id, changes: 1 };
        }

        // 3. UPDATE products SET ... WHERE id = ?
        if (norm.includes("update products set")) {
          const [name, category, price, unit, image, stock, id] = params;
          const p = d.products.find(x => x.id === Number(id));
          if (p) {
            if (name !== undefined) p.name = name;
            if (category !== undefined) p.category = category;
            if (price !== undefined) p.price = Number(price);
            if (unit !== undefined) p.unit = unit;
            if (image !== undefined) p.image = image;
            if (stock !== undefined) p.stock = Number(stock);
            saveStore();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // 4. DELETE FROM products WHERE id = ?
        if (norm.includes("delete from products where id = ?")) {
          const id = Number(params[0]);
          const idx = d.products.findIndex(x => x.id === id);
          if (idx !== -1) {
            d.products.splice(idx, 1);
            saveStore();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // 5. INSERT INTO orders ...
        if (norm.includes("insert into orders")) {
          d.nextOrderId = (d.nextOrderId || 0) + 1;
          const [user_id, total, delivery_type, payment_method, address, store_name] = params;
          const order = {
            id: d.nextOrderId,
            user_id: Number(user_id),
            total: Number(total),
            delivery_type,
            payment_method,
            address: address || "",
            status: "Order Placed",
            store_name: store_name || "SmartGrocer Central",
            created_at: new Date().toISOString()
          };
          d.orders.push(order);
          saveStore();
          return { lastInsertRowid: order.id, changes: 1 };
        }

        // 6. INSERT INTO order_items ...
        if (norm.includes("insert into order_items")) {
          d.nextOrderItemId = (d.nextOrderItemId || 0) + 1;
          const [order_id, product_id, name, price, qty] = params;
          const item = {
            id: d.nextOrderItemId,
            order_id: Number(order_id),
            product_id: Number(product_id),
            name,
            price: Number(price),
            qty: Number(qty)
          };
          d.order_items.push(item);
          saveStore();
          return { lastInsertRowid: item.id, changes: 1 };
        }

        // 7. UPDATE orders SET status = ? WHERE id = ?
        if (norm.includes("update orders set status = ? where id = ?")) {
          const [status, orderId] = params;
          const o = d.orders.find(x => x.id === Number(orderId));
          if (o) {
            o.status = status;
            saveStore();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        return { changes: 0 };
      }
    };
  },

  transaction(fn) {
    return async (...args) => {
      return await fn(...args);
    };
  }
};

// Seed initial store eagerly on boot
loadStore();

export default db;



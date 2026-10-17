import db from "../../../lib/db";
import { readToken } from "../../../lib/auth";

function bearer(req) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

export async function POST(req) {
  try {
    let user = await readToken(bearer(req));
    if (!user) return Response.json({ error: "Login required" }, { status: 401 });

    let { items, total, deliveryType, paymentMethod, address, storeName } = await req.json();
    if (!items?.length) return Response.json({ error: "Cart is empty" }, { status: 400 });

    const finalStoreName = storeName && storeName.trim() ? storeName.trim() : "SmartGrocer Central";

    const r = await db
      .prepare(
        "INSERT INTO orders(user_id, total, delivery_type, payment_method, address, store_name) VALUES(?,?,?,?,?,?)"
      )
      .run(user.id, total, deliveryType, paymentMethod, address || "", finalStoreName);

    const orderId = Number(r.lastInsertRowid);

    for (const item of items) {
      await db
        .prepare("INSERT INTO order_items(order_id, product_id, name, price, qty) VALUES(?,?,?,?,?)")
        .run(orderId, item.id, item.name, item.price, item.qty);
    }

    return Response.json({ ok: true, orderId });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return Response.json({ error: "Failed to place order: " + error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    let user = await readToken(bearer(req));
    if (!user) return Response.json({ error: "Login required" }, { status: 401 });

    let orders = [];
    if (user.role === "owner") {
      const ownerRecord = await db.prepare("SELECT store_name FROM users WHERE id = ?").get(user.id);
      const ownerStore = ownerRecord?.store_name || user.store_name || "SmartGrocer Central";
      orders = await db
        .prepare(
          "SELECT o.*, u.name customer FROM orders o JOIN users u ON u.id = o.user_id WHERE o.store_name = ? OR o.store_name IS NULL ORDER BY o.id DESC"
        )
        .all(ownerStore);
    } else {
      orders = await db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC").all(user.id);
    }

    for (const o of orders) {
      o.items = await db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(o.id);
    }

    return Response.json({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return Response.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    let user = await readToken(bearer(req));
    if (!user || user.role !== "owner") {
      return Response.json({ error: "Owner access required" }, { status: 401 });
    }
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return Response.json({ error: "Order ID and status required" }, { status: 400 });
    }
    await db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
    return Response.json({ ok: true, message: "Order status updated" });
  } catch (error) {
    console.error("PUT /api/orders error:", error);
    return Response.json({ error: "Failed to update order" }, { status: 500 });
  }
}


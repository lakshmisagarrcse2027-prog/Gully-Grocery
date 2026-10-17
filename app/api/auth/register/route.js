import db from "../../../../lib/db.js";
import bcrypt from "bcryptjs";
import { tokenFor } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
    const body = await req.json();
    let { name, email, password, role = "customer", storeName } = body;
    email = email?.trim().toLowerCase();
    const targetRole = role === "owner" ? "owner" : "customer";
    if (targetRole === "owner" && (!storeName || !storeName.trim())) {
      return Response.json(
        { error: "Store Name is required for Store Owner registration." },
        { status: 400 }
      );
    }

    const finalStoreName =
      targetRole === "owner"
        ? storeName.trim()
        : "SmartGrocer Central";

    if (!name || !email || !password || password.length < 6) {
      return Response.json(
        { error: "Name, email and password (6+ characters) required" },
        { status: 400 }
      );
    }

    if (await db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const r = await db
      .prepare("INSERT INTO users(name,email,password_hash,role,store_name) VALUES(?,?,?,?,?)")
      .run(name.trim(), email, hash, targetRole, finalStoreName);

    // If a new store was registered by the owner, seed starter products so they can update prices immediately
    if (targetRole === "owner") {
      const existing = await db
        .prepare("SELECT COUNT(*) as cnt FROM products WHERE store_name = ?")
        .get(finalStoreName);
      if (!existing || existing.cnt === 0) {
        const baseProducts = await db
          .prepare(
            "SELECT * FROM products WHERE store_name = 'SmartGrocer Central' OR store_name IS NULL LIMIT 30"
          )
          .all();
        for (const p of baseProducts) {
          await db
            .prepare(
              "INSERT INTO products(name, category, price, unit, image, stock, visible, store_name) VALUES(?,?,?,?,?,?,?,?)"
            )
            .run(p.name, p.category, p.price, p.unit, p.image || "", p.stock || 50, 1, finalStoreName);
        }
      }
    }

    const u = {
      id: Number(r.lastInsertRowid),
      name: name.trim(),
      email,
      role: targetRole,
      store_name: finalStoreName
    };
    const token = await tokenFor(u);
    return Response.json({ token, user: u }, { status: 201 });
  } catch (e) {
    console.error("Register error:", e);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}

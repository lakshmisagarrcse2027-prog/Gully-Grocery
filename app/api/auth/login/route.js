import db from "../../../../lib/db.js";
import bcrypt from "bcryptjs";
import { tokenFor } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
    const { email, password, expectedRole } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();
    const u = await db.prepare("SELECT * FROM users WHERE email=?").get(cleanEmail);

    if (!u || !(await bcrypt.compare(password || "", u.password_hash))) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (expectedRole && u.role !== expectedRole) {
      return Response.json(
        { error: `Account is registered as ${u.role}, please switch to ${u.role === "owner" ? "Owner" : "Customer"} login.` },
        { status: 403 }
      );
    }

    const user = { id: u.id, name: u.name, email: u.email, role: u.role, store_name: u.store_name || "SmartGrocer Central" };
    const token = await tokenFor(user);
    return Response.json({ token, user });
  } catch (err) {
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}

import db from "../../../lib/db.js";

export async function GET() {
  try {
    const owners = await db
      .prepare(
        "SELECT DISTINCT store_name FROM users WHERE role = 'owner' AND store_name IS NOT NULL AND TRIM(store_name) != ''"
      )
      .all();
    
    let storeNames = (owners || []).map((o) => o.store_name);

    if (!storeNames.includes("SmartGrocer Central")) {
      storeNames.unshift("SmartGrocer Central");
    }

    const stores = storeNames.map((name, idx) => ({ id: idx + 1, name }));
    return Response.json({ stores });
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return Response.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

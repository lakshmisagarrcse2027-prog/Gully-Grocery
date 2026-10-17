import db from "../../../lib/db.js";
import { readToken } from "../../../lib/auth.js";

async function verifyOwner(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const payload = await readToken(token);
  if (!payload || payload.role !== "owner") return null;
  return payload;
}

// GET /api/products - Fetch products (scoped by store_name)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const showAll = url.searchParams.get("all") === "true";
    const storeName = url.searchParams.get("store_name") || url.searchParams.get("store");

    let query = "";
    let params = [];

    if (showAll) {
      if (storeName) {
        query = "SELECT * FROM products WHERE store_name = ? OR store_name IS NULL ORDER BY id ASC";
        params = [storeName];
      } else {
        query = "SELECT * FROM products ORDER BY id ASC";
      }
    } else {
      if (storeName) {
        query = "SELECT * FROM products WHERE (store_name = ? OR store_name IS NULL) AND (visible IS NULL OR visible = 1) ORDER BY id ASC";
        params = [storeName];
      } else {
        query = "SELECT * FROM products WHERE visible IS NULL OR visible = 1 ORDER BY id ASC";
      }
    }

    const products = await db.prepare(query).all(...params);
    return Response.json({ products });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products - Add new product (Owner only, assigned to owner's store)
export async function POST(req) {
  try {
    const owner = await verifyOwner(req);
    if (!owner) {
      return Response.json({ error: "Unauthorized. Owner access required." }, { status: 401 });
    }

    const ownerUser = await db.prepare("SELECT store_name FROM users WHERE id = ?").get(owner.id);
    const storeName = ownerUser?.store_name || owner.store_name || "SmartGrocer Central";

    const { name, category, price, unit, image, stock, visible } = await req.json();

    if (!name || !category || price === undefined || !unit) {
      return Response.json({ error: "Name, category, price, and unit are required." }, { status: 400 });
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock !== undefined ? stock : 50, 10);
    const imgUrl = image && image.trim() ? image.trim() : "";
    const isVisible = visible !== undefined ? (visible ? 1 : 0) : 1;

    const result = await db.prepare(
      "INSERT INTO products (name, category, price, unit, image, stock, visible, store_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(name.trim(), category.trim(), numPrice, unit.trim(), imgUrl, numStock, isVisible, storeName);

    const newProd = await db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
    return Response.json({ message: "Product added successfully", product: newProd }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return Response.json({ error: "Failed to add product" }, { status: 500 });
  }
}

// PUT /api/products - Update product price, stock, or details (Owner only)
export async function PUT(req) {
  try {
    const owner = await verifyOwner(req);
    if (!owner) {
      return Response.json({ error: "Unauthorized. Owner access required." }, { status: 401 });
    }

    const { id, name, category, price, unit, image, stock } = await req.json();

    if (!id) {
      return Response.json({ error: "Product ID is required." }, { status: 400 });
    }

    const existing = await db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!existing) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedCategory = category !== undefined ? category.trim() : existing.category;
    const updatedPrice = price !== undefined ? parseFloat(price) : existing.price;
    const updatedUnit = unit !== undefined ? unit.trim() : existing.unit;
    const updatedImage = image !== undefined && image.trim() ? image.trim() : existing.image;
    const updatedStock = stock !== undefined ? parseInt(stock, 10) : existing.stock;

    await db.prepare(
      "UPDATE products SET name = ?, category = ?, price = ?, unit = ?, image = ?, stock = ? WHERE id = ?"
    ).run(updatedName, updatedCategory, updatedPrice, updatedUnit, updatedImage, updatedStock, id);

    const updatedProd = await db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    return Response.json({ message: "Product updated successfully", product: updatedProd });
  } catch (error) {
    console.error("PUT /api/products error:", error);
    return Response.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products - Remove product (Owner only)
export async function DELETE(req) {
  try {
    const owner = await verifyOwner(req);
    if (!owner) {
      return Response.json({ error: "Unauthorized. Owner access required." }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Product ID is required." }, { status: 400 });
    }

    await db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return Response.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/products error:", error);
    return Response.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

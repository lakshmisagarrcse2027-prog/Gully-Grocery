import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import bcrypt from "bcryptjs";
import { products as initialProducts } from "./products.js";

const require = createRequire(import.meta.url);
// Use pure JS sql-asm engine which requires NO external .wasm file, eliminating Vercel/serverless bundling issues
const initSqlJs = require("sql.js/dist/sql-asm.js");

// Determine database path:
// On Vercel / AWS Lambda, process.cwd() is read-only (/var/task), while os.tmpdir() (/tmp) is writable.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const localDbPath = path.resolve(process.cwd(), "smartgrocer.db");
const tmpDbPath = path.join(os.tmpdir(), "smartgrocer.db");
const dbPath = isServerless ? tmpDbPath : localDbPath;

let sqliteDb = null;
let initPromise = null;

function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  if (!initPromise) {
    initPromise = initSqlJs().then((SQL) => {
      let fileBuffer = null;
      if (fs.existsSync(dbPath)) {
        try {
          fileBuffer = fs.readFileSync(dbPath);
        } catch (e) {
          console.error("Failed to read primary db file:", e);
        }
      } else if (isServerless && fs.existsSync(localDbPath)) {
        try {
          fileBuffer = fs.readFileSync(localDbPath);
        } catch (e) {
          console.error("Failed to read seed db file:", e);
        }
      }

      sqliteDb = new SQL.Database(fileBuffer);

      try { sqliteDb.exec("PRAGMA journal_mode = WAL"); } catch (e) { }
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',store_name TEXT DEFAULT 'SmartGrocer Central');
        CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,total REAL,delivery_type TEXT,payment_method TEXT,address TEXT,status TEXT DEFAULT 'Order Placed',store_name TEXT DEFAULT 'SmartGrocer Central',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,product_id INTEGER,name TEXT,price REAL,qty INTEGER);
        CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price REAL NOT NULL,unit TEXT NOT NULL,image TEXT NOT NULL,stock INTEGER NOT NULL DEFAULT 50,visible INTEGER NOT NULL DEFAULT 1,store_name TEXT DEFAULT 'SmartGrocer Central');
      `);

      try { sqliteDb.exec("ALTER TABLE users ADD COLUMN store_name TEXT DEFAULT 'SmartGrocer Central'"); } catch(e){}
      try { sqliteDb.exec("ALTER TABLE products ADD COLUMN store_name TEXT DEFAULT 'SmartGrocer Central'"); } catch(e){}
      try { sqliteDb.exec("ALTER TABLE orders ADD COLUMN store_name TEXT DEFAULT 'SmartGrocer Central'"); } catch(e){}
      try { sqliteDb.exec("ALTER TABLE products ADD COLUMN visible INTEGER DEFAULT 1"); } catch(e){}

      const ownerEmail = "owner@smartgrocer.local";
      const checkOwner = sqliteDb.prepare("SELECT id FROM users WHERE email=?");
      checkOwner.bind([ownerEmail]);
      if (!checkOwner.step()) {
        sqliteDb.run("INSERT INTO users(name,email,password_hash,role,store_name) VALUES(?,?,?,?,?)", [
          "Store Owner", ownerEmail, bcrypt.hashSync("Owner@123", 12), "owner", "SmartGrocer Central"
        ]);
      }
      checkOwner.free();

      const customerEmail = "customer@smartgrocer.local";
      const checkCust = sqliteDb.prepare("SELECT id FROM users WHERE email=?");
      checkCust.bind([customerEmail]);
      if (!checkCust.step()) {
        sqliteDb.run("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)", [
          "Sample Customer", customerEmail, bcrypt.hashSync("Customer@123", 12), "customer"
        ]);
      }
      checkCust.free();

      const res = sqliteDb.exec("SELECT COUNT(*) as cnt FROM products")[0];
      const count = res ? res.values[0][0] : 0;
      if (count === 0) {
        for (const p of initialProducts) {
          sqliteDb.run(
            "INSERT INTO products(id, name, category, price, unit, image, stock, visible, store_name) VALUES(?,?,?,?,?,?,?,?,?)",
            [p.id, p.name, p.category, p.price, p.unit, p.image, p.stock || 50, 1, "SmartGrocer Central"]
          );
        }
      }

      save();
      return sqliteDb;
    });
  }
  return initPromise;
}

function save() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.warn("Notice: SQLite file save skipped or failed (in-memory state preserved):", e.message);
  }
}

const db = {
  prepare(sql) {
    return {
      async get(...params) {
        const sDb = await getSqliteDb();
        const stmt = sDb.prepare(sql);
        stmt.bind(params.map(p => p === undefined ? null : p));
        let row = undefined;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      async all(...params) {
        const sDb = await getSqliteDb();
        const stmt = sDb.prepare(sql);
        stmt.bind(params.map(p => p === undefined ? null : p));
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      async run(...params) {
        const sDb = await getSqliteDb();
        sDb.run(sql, params.map(p => p === undefined ? null : p));
        const res = sDb.exec("SELECT last_insert_rowid() AS id, changes() AS changes")[0];
        const lastInsertRowid = res ? res.values[0][0] : 0;
        const changes = res ? res.values[0][1] : 0;
        save();
        return { lastInsertRowid, changes };
      }
    };
  },
  transaction(fn) {
    return async (...args) => {
      const sDb = await getSqliteDb();
      sDb.exec("BEGIN TRANSACTION");
      try {
        const res = await fn(...args);
        sDb.exec("COMMIT");
        save();
        return res;
      } catch (err) {
        sDb.exec("ROLLBACK");
        throw err;
      }
    };
  }
};

// Safely warm up DB asynchronously without throwing unhandled promise rejections on cold start
getSqliteDb().catch((err) => {
  console.error("Database initialization failed:", err);
});

export default db;




require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD)) {
  throw new Error("Configure secure production credentials.");
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));

app.use(session({
  name: "loan_admin_session",
  secret: process.env.SESSION_SECRET || "local-development-only-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    maxAge: 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, "public")));

const db = new Database(path.join(__dirname, "applications.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending review',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
)
`);

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8
});

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function adminOnly(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.status(401).json({
    error: "Tafadhali ingia kama msimamizi."
  });
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));

  return aa.length === bb.length &&
    crypto.timingSafeEqual(aa, bb);
}

// Receive applications
app.post("/api/applications", submitLimiter, (req, res) => {
  const amount = Number(req.body.amount);
  const fullName = clean(req.body.fullName, 100);
  const countryCode = clean(req.body.countryCode, 6);
  const phone = clean(req.body.phone, 25);
  const country = clean(req.body.country, 60);
  const purpose = clean(req.body.purpose, 1000);

  if (
    !Number.isInteger(amount) ||
    amount < 10000 ||
    amount > 1000000 ||
    !fullName ||
    !countryCode ||
    !phone ||
    !country ||
    !purpose
  ) {
    return res.status(400).json({
      error: "Tafadhali jaza taarifa zote kwa usahihi."
    });
  }

  const reference =
    "LN-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  db.prepare(`
    INSERT INTO applications
    (reference, amount, full_name, country_code, phone, country, purpose)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    reference,
    amount,
    fullName,
    countryCode,
    phone,
    country,
    purpose
  );

  res.status(201).json({
    reference,
    status: "Pending review"
  });
});

// Check application status
app.get("/api/applications/:reference", (req, res) => {
  const row = db.prepare(`
    SELECT reference, amount, status, created_at
    FROM applications
    WHERE reference = ?
  `).get(clean(req.params.reference, 30));

  if (!row) {
    return res.status(404).json({
      error: "Ombi halijapatikana."
    });
  }

  res.json(row);
});

// Administrator login
app.post("/admin/login", loginLimiter, (req, res) => {
  const username = clean(req.body.username, 80);
  const password = String(req.body.password || "");

  if (
    !safeEqual(username, process.env.ADMIN_USERNAME || "admin") ||
    !safeEqual(password, process.env.ADMIN_PASSWORD || "change-this-password")
  ) {
    return res.status(401).send("Taarifa za kuingia si sahihi.");
  }

  req.session.regenerate(err => {
    if (err) {
      return res.status(500).send("Hitilafu ya kuingia.");
    }

    req.session.isAdmin = true;
    res.redirect("/admin.html");
  });
});

// Administrator logout
app.post("/admin/logout", adminOnly, (req, res) => {
  req.session.destroy(() => res.redirect("/admin.html"));
});

// Show applications to administrator
app.get("/api/admin/applications", adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT reference, amount, full_name, country_code,
    phone, country, purpose, status, created_at
    FROM applications
    ORDER BY id DESC
    LIMIT 200
  `).all();

  res.json(rows);
});

// Approve or reject application
app.post(
  "/api/admin/applications/:reference/status",
  adminOnly,
  (req, res) => {
    const status = req.body.status;

    if (![
      "Approved for further processing",
      "Rejected"
    ].includes(status)) {
      return res.status(400).json({
        error: "Hali si sahihi."
      });
    }

    const result = db.prepare(`
      UPDATE applications
      SET status = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE reference = ?
    `).run(status, clean(req.params.reference, 30));

    if (!result.changes) {
      return res.status(404).json({
        error: "Ombi halijapatikana."
      });
    }

    res.json({ ok: true });
  }
);

app.listen(PORT, () => {
  console.log(`Loan portal running on port ${PORT}`);
});
    

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* phục vụ HTML */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

/* upload file */
const upload = multer({ storage: multer.memoryStorage() });

/* Supabase */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* PostgreSQL */
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ===== API ===== */

/* lấy danh sách tài liệu (public) */
app.get("/api/docs", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM documents ORDER BY created_at DESC"
  );
  res.json(rows);
});

/* middleware kiểm tra admin */
async function isAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.sendStatus(401);

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.sendStatus(401);

  /* chỉ cho admin */
  if (data.user.email !== "dn3844146@gmail.com") {
    return res.sendStatus(403);
  }
  next();
}

/* upload tài liệu (admin only) */
app.post("/api/upload", isAdmin, upload.single("file"), async (req, res) => {
  const fileName = Date.now() + "-" + req.file.originalname;

  await supabase.storage
    .from("documents")
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype
    });

  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(fileName);

  await pool.query(
    "INSERT INTO documents (title, file_url) VALUES ($1, $2)",
    [req.body.title, data.publicUrl]
  );

  res.json({ success: true });
});

/* start server */
app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);

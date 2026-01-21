import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* Middleware kiểm tra login */
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.sendStatus(401);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.sendStatus(403);

  req.user = data.user;
  next();
}

/* Lấy danh sách file (public) */
app.get("/api/files", async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);
  res.json(data);
});

/* Upload file (ADMIN ONLY) */
app.post(
  "/api/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).send("No file");

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const { error } = await supabase.storage
      .from("files")
      .upload(fileName, req.file.buffer);

    if (error) return res.status(500).json(error);

    const { data } = supabase.storage
      .from("files")
      .getPublicUrl(fileName);

    await supabase.from("files").insert({
      name: req.file.originalname,
      url: data.publicUrl
    });

    res.json({ success: true });
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));



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

/* API: lấy danh sách file */
app.get("/api/files", async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);
  res.json(data);
});

/* API: upload file (admin) */
app.post("/api/upload", upload.single("file"), async (req, res) => {
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});


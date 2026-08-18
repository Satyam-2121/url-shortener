import express from "express";
import { pool } from "./db/postgres";
import { redisClient, connectRedis } from "./db/redis";
import { createShortUrl } from "./services/url.service";

const app = express();

app.use(express.json());

app.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("HEALTH CHECK ERROR:", error);

    return res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.post("/shorten", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        message: "URL is required",
      });
    }

    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          message: "Only HTTP and HTTPS URLs are allowed",
        });
      }
    } catch {
      return res.status(400).json({
        message: "Invalid URL",
      });
    }

    console.log("Creating short URL:", url);

    const data = await createShortUrl(url);

    console.log("Created:", data);

    return res.status(201).json({
      originalUrl: data.original_url,
      shortCode: data.short_code,
      shortUrl: `http://localhost:3000/${data.short_code}`,
    });
  } catch (error) {
    console.error("SHORTEN ERROR:", error);

    return res.status(500).json({
      message: error instanceof Error
        ? error.message
        : "Something went wrong",
    });
  }
});

app.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    const result = await pool.query(
      `SELECT original_url
       FROM urls
       WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Short URL not found",
      });
    }

    const originalUrl = result.rows[0].original_url;

    await pool.query(
      `UPDATE urls
       SET visit_count = visit_count + 1
       WHERE short_code = $1`,
      [shortCode]
    );

    const cachedUrl = await redisClient.get(shortCode);

    if (cachedUrl) {
      console.log("Cache Hit");
      return res.redirect(cachedUrl);
    }

    console.log("Cache Miss");

    await redisClient.set(shortCode, originalUrl);

    return res.redirect(originalUrl);
  } catch (error) {
    console.error("REDIRECT ERROR:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

app.get("/analytics/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    const result = await pool.query(
      `SELECT original_url,
              short_code,
              visit_count,
              created_at
       FROM urls
       WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

connectRedis();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
import express from "express";
import { pool } from "./db/postgres";
import { redisClient, connectRedis } from "./db/redis";
import { createShortUrl } from "./services/url.service";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, "");

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
    const input = req.body?.url;

    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({
        message: "URL is required",
      });
    }

    const url = input.trim();

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
      shortUrl: `${publicBaseUrl}/${data.short_code}`,
    });
  } catch (error) {
    console.error("SHORTEN ERROR:", error);

    return res.status(500).json({
      message: "Something went wrong",
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

    let cachedUrl: string | null = null;
    if (redisClient.isReady) {
      try {
        cachedUrl = await redisClient.get(shortCode);
      } catch (error) {
        console.error("CACHE READ ERROR:", error);
      }
    }

    if (cachedUrl) {
      console.log("Cache Hit");
      return res.redirect(cachedUrl);
    }

    console.log("Cache Miss");

    if (redisClient.isReady) {
      try {
        await redisClient.set(shortCode, originalUrl);
      } catch (error) {
        console.error("CACHE WRITE ERROR:", error);
      }
    }

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

import { Request, Response } from "express";
import { redisClient } from "../db/redis";
import { createShortUrl, getOriginalUrl } from "../services/url.service";

export async function shortenUrl(req: Request, res: Response) {
  try {
    const { url } = req.body;

    const data = await createShortUrl(url);

    res.status(201).json({
      originalUrl: data.original_url,
      shortCode: data.short_code,
      shortUrl: `http://localhost:3000/${data.short_code}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function redirectUrl(req: Request, res: Response) {
  try {
    const { shortCode } = req.params;

    if (typeof shortCode !== "string") {
      return res.status(400).json({
        message: "Invalid short code",
      });
    }

    const cachedUrl = await redisClient.get(shortCode);

    if (cachedUrl) {
      console.log("Cache Hit");
      return res.redirect(cachedUrl);
    }

    console.log("Cache Miss");

    const url = await getOriginalUrl(shortCode);

    if (!url) {
      return res.status(404).json({
        message: "Short URL not found",
      });
    }

    await redisClient.set(shortCode, url.original_url);

    return res.redirect(url.original_url);
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
}
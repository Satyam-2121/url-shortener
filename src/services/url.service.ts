import { pool } from "../db/postgres";
import { nanoid } from "nanoid";

export async function createShortUrl(originalUrl: string) {
  const shortCode = nanoid(6);

  const result = await pool.query(
    `
    INSERT INTO urls (original_url, short_code)
    VALUES ($1, $2)
    RETURNING *
    `,
    [originalUrl, shortCode]
  );

  return result.rows[0];
}

export async function getOriginalUrl(shortCode: string) {
  const result = await pool.query(
    `SELECT * FROM urls WHERE short_code = $1`,
    [shortCode]
  );

  return result.rows[0] ?? null;
}
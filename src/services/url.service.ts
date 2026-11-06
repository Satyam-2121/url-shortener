import { pool } from "../db/postgres";
import { nanoid } from "nanoid";

export async function createShortUrl(originalUrl: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = nanoid(6);

    const result = await pool.query(
      `
      INSERT INTO urls (original_url, short_code)
      VALUES ($1, $2)
      ON CONFLICT (short_code) DO NOTHING
      RETURNING *
      `,
      [originalUrl, shortCode]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  throw new Error("Could not generate a unique short code");
}

export async function getOriginalUrl(shortCode: string) {
  const result = await pool.query(
    `SELECT * FROM urls WHERE short_code = $1`,
    [shortCode]
  );

  return result.rows[0] ?? null;
}

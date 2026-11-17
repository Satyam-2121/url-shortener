import "dotenv/config";
import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  // Cache operations should fail rather than queue while Redis is reconnecting.
  disableOfflineQueue: true,
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

export async function connectRedis() {
  await redisClient.connect();
  console.log("Redis Connected");
}

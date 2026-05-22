import { createHash } from "crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + process.env.SESSION_SECRET || "qwizds-salt-2024").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

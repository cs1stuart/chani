export const BACKEND_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
    : "";

export const PAGE_SIZE = 10;

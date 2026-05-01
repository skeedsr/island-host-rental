import { getAuth, createClerkClient } from "@clerk/express";
import type { RequestHandler } from "express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const requireUser: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    if (user.publicMetadata?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Authentication error" });
  }
};

export { clerkClient };

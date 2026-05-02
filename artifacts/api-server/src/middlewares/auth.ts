import type { RequestHandler } from "express";

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const requireUser: RequestHandler = (_req, _res, next) => {
  next();
};

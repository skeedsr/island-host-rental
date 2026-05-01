import type { RequestHandler } from "express";

export const requireUser: RequestHandler = (_req, _res, next) => {
  next();
};

export const requireAdmin: RequestHandler = (_req, _res, next) => {
  next();
};

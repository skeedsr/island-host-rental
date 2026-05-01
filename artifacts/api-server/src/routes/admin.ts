import { Router } from "express";

const router = Router();

router.get("/admin/users", (_req, res) => {
  res.json([]);
});

router.patch("/admin/users/:id/role", (_req, res) => {
  res.status(501).json({ error: "User management requires an authentication provider" });
});

export default router;

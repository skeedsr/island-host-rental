import { Router } from "express";

const router = Router();

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(503).json({
      error: "Admin password not configured. Set ADMIN_PASSWORD in Secrets.",
    });
    return;
  }

  if (username !== adminUsername || password !== adminPassword) {
    res.status(401).json({ error: "Username o password non corretti" });
    return;
  }

  req.session.isAdmin = true;
  res.json({ ok: true });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res) => {
  if (req.session.isAdmin) {
    res.json({ isAdmin: true });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;

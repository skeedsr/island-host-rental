import { Router } from "express";
import { requireAdmin, clerkClient } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.use(requireAdmin);

router.get("/admin/users", async (req, res) => {
  try {
    const response = await clerkClient.users.getUserList({ limit: 100 });
    const users = response.data.map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      imageUrl: u.imageUrl,
      role: (u.publicMetadata?.role as string) ?? "user",
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    }));
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/admin/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const parsed = z.object({ role: z.enum(["user", "admin"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Role must be 'user' or 'admin'" });
    return;
  }

  try {
    await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: { role: parsed.data.role },
    });
    res.json({ success: true, role: parsed.data.role });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Failed to update user role" });
  }
});

export default router;

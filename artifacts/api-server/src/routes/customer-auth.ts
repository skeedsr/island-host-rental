import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(2, "Nome troppo corto"),
  lastName: z.string().min(2, "Cognome troppo corto"),
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/customer/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" });
    return;
  }

  const { firstName, lastName, email, password, phone } = parsed.data;

  const [existing] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (existing) {
    res.status(409).json({ error: "Esiste già un account con questa email" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [customer] = await db
    .insert(customersTable)
    .values({ firstName, lastName, email: email.toLowerCase(), passwordHash, phone })
    .returning();

  req.session.customerId = customer.id;
  res.status(201).json({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
  });
});

router.post("/customer/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email o password non validi" });
    return;
  }

  const { email, password } = parsed.data;

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, email.toLowerCase()));

  if (!customer) {
    res.status(401).json({ error: "Email o password non corretti" });
    return;
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email o password non corretti" });
    return;
  }

  req.session.customerId = customer.id;
  res.json({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
  });
});

router.post("/customer/logout", (req, res) => {
  req.session.customerId = undefined;
  res.json({ ok: true });
});

router.get("/customer/me", async (req, res) => {
  if (!req.session.customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, req.session.customerId));

  if (!customer) {
    req.session.customerId = undefined;
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
  });
});

export default router;

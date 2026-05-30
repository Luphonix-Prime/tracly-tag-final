import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, companiesTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password, phone, companyName, companyEmail, companyWebsiteUrl } = parsed.data;

  // Verify if username already exists
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existingUser) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  try {
    // Create the company
    const [company] = await db
      .insert(companiesTable)
      .values({
        name: companyName,
        email: companyEmail,
        address: companyWebsiteUrl,
        gstin: null,
      })
      .returning();

    if (!company) {
      throw new Error("Failed to create company");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create administrator user linked to company
    const [user] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        phone: phone ?? null,
        passwordHash,
        role: "client_admin",
        companyId: company.id,
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", user.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: isProduction,
      sameSite: "lax",
    });

    res.status(201).json(
      LoginResponse.parse({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: company.name,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(400).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  let companyName: string | null = null;
  if (user.companyId) {
    const [c] = await db
      .select({ name: companiesTable.name })
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId));
    companyName = c?.name ?? null;
  }

  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  res.cookie("connect.sid", user.id.toString(), {
    signed: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: isProduction,
    sameSite: "lax",
  });

  res.json(
    LoginResponse.parse({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName,
    }),
  );
});

router.post("/auth/logout", (req, res): void => {
  res.clearCookie("connect.sid");
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  let companyName: string | null = null;
  if (req.user.companyId) {
    const [c] = await db
      .select({ name: companiesTable.name })
      .from(companiesTable)
      .where(eq(companiesTable.id, req.user.companyId));
    companyName = c?.name ?? null;
  }
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    companyId: req.user.companyId,
    companyName,
  });
});

export default router;

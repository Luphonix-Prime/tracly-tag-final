import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, companiesTable, passkeysTable, deviceCodesTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody } from "@workspace/api-zod";
import crypto from "crypto";
import { sendOtpEmail } from "../lib/mail";

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
        companyUrl: company.companyUrl ?? null,
        isActive: user.isActive,
        enabledModules: user.enabledModules,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionExpiresAt: company.subscriptionExpiresAt,
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
  let companyUrl: string | null = null;
  let subscriptionPlan: string | null = null;
  let subscriptionStatus: string | null = null;
  let subscriptionExpiresAt: string | null = null;
  if (user.companyId) {
    const [c] = await db
      .select({ 
        name: companiesTable.name,
        companyUrl: companiesTable.companyUrl,
        subscriptionPlan: companiesTable.subscriptionPlan,
        subscriptionStatus: companiesTable.subscriptionStatus,
        subscriptionExpiresAt: companiesTable.subscriptionExpiresAt,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId));
    companyName = c?.name ?? null;
    companyUrl = c?.companyUrl ?? null;
    subscriptionPlan = c?.subscriptionPlan ?? null;
    subscriptionStatus = c?.subscriptionStatus ?? null;
    subscriptionExpiresAt = c?.subscriptionExpiresAt ?? null;
  }

  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  if (user.role !== "master" && user.role !== "super_master") {
    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await sendOtpEmail(user.email, otpCode);
    } catch (err) {
      req.log.error({ err, email: user.email }, "Failed to send OTP email");
    }

    const otpPayload = JSON.stringify({ userId: user.id, otp: otpCode });
    res.cookie("temp_otp", otpPayload, {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 5, // 5 minutes
      secure: isProduction,
      sameSite: "lax",
    });

    res.json({
      otpRequired: true,
      userId: user.id,
      email: user.email,
      otpCode, // Fallback for developer/offline testing
    });
    return;
  }

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
      companyUrl,
      isActive: user.isActive,
      enabledModules: user.enabledModules,
      subscriptionPlan,
      subscriptionStatus,
      subscriptionExpiresAt,
    }),
  );
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { otp } = req.body;
  const tempOtpPayload = req.signedCookies?.["temp_otp"];

  if (!tempOtpPayload) {
    res.status(400).json({ error: "Session expired or OTP request invalid. Please log in again." });
    return;
  }

  let payload: { userId: number; otp: string };
  try {
    payload = JSON.parse(tempOtpPayload);
  } catch (e) {
    res.status(400).json({ error: "Invalid session payload. Please log in again." });
    return;
  }

  if (payload.otp !== otp) {
    res.status(400).json({ error: "Incorrect OTP code. Please try again." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  let companyName: string | null = null;
  let companyUrl: string | null = null;
  let subscriptionPlan: string | null = null;
  let subscriptionStatus: string | null = null;
  let subscriptionExpiresAt: string | null = null;
  if (user.companyId) {
    const [c] = await db
      .select({ 
        name: companiesTable.name,
        companyUrl: companiesTable.companyUrl,
        subscriptionPlan: companiesTable.subscriptionPlan,
        subscriptionStatus: companiesTable.subscriptionStatus,
        subscriptionExpiresAt: companiesTable.subscriptionExpiresAt,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId));
    companyName = c?.name ?? null;
    companyUrl = c?.companyUrl ?? null;
    subscriptionPlan = c?.subscriptionPlan ?? null;
    subscriptionStatus = c?.subscriptionStatus ?? null;
    subscriptionExpiresAt = c?.subscriptionExpiresAt ?? null;
  }

  // Clear OTP cookie
  res.clearCookie("temp_otp");

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
      companyUrl,
      isActive: user.isActive,
      enabledModules: user.enabledModules,
      subscriptionPlan,
      subscriptionStatus,
      subscriptionExpiresAt,
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
  let companyUrl: string | null = null;
  let subscriptionPlan: string | null = null;
  let subscriptionStatus: string | null = null;
  let subscriptionExpiresAt: string | null = null;
  if (req.user.companyId) {
    const [c] = await db
      .select({ 
        name: companiesTable.name,
        companyUrl: companiesTable.companyUrl,
        subscriptionPlan: companiesTable.subscriptionPlan,
        subscriptionStatus: companiesTable.subscriptionStatus,
        subscriptionExpiresAt: companiesTable.subscriptionExpiresAt,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, req.user.companyId));
    companyName = c?.name ?? null;
    companyUrl = c?.companyUrl ?? null;
    subscriptionPlan = c?.subscriptionPlan ?? null;
    subscriptionStatus = c?.subscriptionStatus ?? null;
    subscriptionExpiresAt = c?.subscriptionExpiresAt ?? null;
  }
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    companyId: req.user.companyId,
    companyName,
    companyUrl,
    isActive: req.user.isActive,
    enabledModules: req.user.enabledModules,
    subscriptionPlan,
    subscriptionStatus,
    subscriptionExpiresAt,
  });
});

// --- SSO Endpoints ---
router.post("/auth/sso", async (req, res): Promise<void> => {
  const { provider, email, username, name, companyName, companyWebsiteUrl } = req.body;
  if (!email || !username) {
    res.status(400).json({ error: "Email and username are required" });
    return;
  }

  try {
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      const [userByEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      if (userByEmail) {
        user = userByEmail;
      }
    }

    let resolvedCompanyId = user?.companyId ?? null;
    let resolvedCompanyName: string | null = null;
    let subscriptionPlan: string | null = null;
    let subscriptionStatus: string | null = null;
    let subscriptionExpiresAt: string | null = null;

    if (!user) {
      const targetCompanyName = companyName || `${name || username}'s Organization`;
      const targetWebsite = companyWebsiteUrl || `https://${username.toLowerCase()}.tracelytag.com`;

      const [company] = await db
        .insert(companiesTable)
        .values({
          name: targetCompanyName,
          email: email,
          address: targetWebsite,
          gstin: null,
        })
        .returning();

      if (!company) {
        throw new Error("Failed to create company");
      }

      resolvedCompanyId = company.id;
      resolvedCompanyName = company.name;
      subscriptionPlan = company.subscriptionPlan;
      subscriptionStatus = company.subscriptionStatus;
      subscriptionExpiresAt = company.subscriptionExpiresAt;

      const randomPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          username,
          email,
          phone: null,
          passwordHash,
          role: "client_admin",
          companyId: resolvedCompanyId,
        })
        .returning();

      if (!newUser) {
        throw new Error("Failed to create user");
      }
      user = newUser;
    } else {
      if (user.companyId) {
        const [c] = await db
          .select({ 
            name: companiesTable.name,
            subscriptionPlan: companiesTable.subscriptionPlan,
            subscriptionStatus: companiesTable.subscriptionStatus,
            subscriptionExpiresAt: companiesTable.subscriptionExpiresAt,
          })
          .from(companiesTable)
          .where(eq(companiesTable.id, user.companyId));
        resolvedCompanyName = c?.name ?? null;
        subscriptionPlan = c?.subscriptionPlan ?? null;
        subscriptionStatus = c?.subscriptionStatus ?? null;
        subscriptionExpiresAt = c?.subscriptionExpiresAt ?? null;
      }
    }

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", user.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: isProduction,
      sameSite: "lax",
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: resolvedCompanyName,
      subscriptionPlan,
      subscriptionStatus,
      subscriptionExpiresAt,
    });
  } catch (err) {
    req.log.error({ err }, "SSO Authentication failed");
    res.status(500).json({ error: "SSO Authentication failed" });
  }
});

// --- Passkey WebAuthn Endpoints ---
router.post("/auth/passkey/register-options", async (req, res): Promise<void> => {
  const { username } = req.body;
  const challenge = crypto.randomBytes(32).toString("base64url");
  
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  res.cookie("passkey_challenge", challenge, {
    signed: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 5,
    secure: isProduction,
    sameSite: "lax",
  });

  res.json({
    challenge,
    rp: { name: "TraclyTag", id: req.hostname === "localhost" ? "localhost" : req.hostname },
    user: {
      id: crypto.randomBytes(16).toString("base64url"),
      name: username || "anonymous",
      displayName: username || "Anonymous User",
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60000,
    attestation: "none",
  });
});

router.post("/auth/passkey/register-verify", async (req, res): Promise<void> => {
  const { registrationResponse, userData, isSimulated } = req.body;
  const savedChallenge = req.signedCookies?.["passkey_challenge"];

  if (!savedChallenge) {
    res.status(400).json({ error: "Session expired or challenge missing" });
    return;
  }

  res.clearCookie("passkey_challenge");

  try {
    const { id: credentialId, response } = registrationResponse;

    if (!isSimulated && response?.clientDataJSON) {
      try {
        const clientData = JSON.parse(Buffer.from(response.clientDataJSON, "base64url").toString("utf-8"));
        if (clientData.challenge !== savedChallenge) {
          res.status(400).json({ error: "Challenge verification failed" });
          return;
        }
      } catch (e) {
        req.log.warn({ e }, "Failed to parse clientDataJSON during passkey verify");
      }
    }

    const { username, email, companyName, companyEmail, companyWebsiteUrl } = userData;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      const [company] = await db
        .insert(companiesTable)
        .values({
          name: companyName,
          email: companyEmail,
          address: companyWebsiteUrl,
          gstin: null,
        })
        .returning();

      if (!company) throw new Error("Failed to create company");

      const randomPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          username,
          email,
          phone: null,
          passwordHash,
          role: "client_admin",
          companyId: company.id,
        })
        .returning();

      if (!newUser) throw new Error("Failed to create user");
      user = newUser;
    }

    const publicKey = isSimulated ? "MOCK_SIMULATED_PUBLIC_KEY" : (response?.attestationObject || "STANDARD_WEBAUTHN_KEY");
    await db
      .insert(passkeysTable)
      .values({
        userId: user.id,
        credentialId,
        publicKey,
        counter: 0,
      });

    let companyNameVal: string | null = null;
    if (user.companyId) {
      const [c] = await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, user.companyId));
      companyNameVal = c?.name ?? null;
    }

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", user.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: isProduction,
      sameSite: "lax",
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: companyNameVal,
    });
  } catch (err: any) {
    req.log.error({ err }, "Passkey registration verify failed");
    res.status(500).json({ error: err.message || "Passkey registration failed" });
  }
});

router.post("/auth/passkey/login-options", async (req, res): Promise<void> => {
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ error: "Username is required for passkey login" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userPasskeys = await db
      .select()
      .from(passkeysTable)
      .where(eq(passkeysTable.userId, user.id));

    if (userPasskeys.length === 0) {
      res.status(400).json({ error: "No passkeys registered for this user" });
      return;
    }

    const challenge = crypto.randomBytes(32).toString("base64url");
    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("passkey_challenge", challenge, {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 5,
      secure: isProduction,
      sameSite: "lax",
    });

    res.json({
      challenge,
      rpId: req.hostname === "localhost" ? "localhost" : req.hostname,
      allowCredentials: userPasskeys.map(pk => ({
        id: pk.credentialId,
        type: "public-key",
      })),
      timeout: 60000,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate login options" });
  }
});

router.post("/auth/passkey/login-verify", async (req, res): Promise<void> => {
  const { loginResponse, username, isSimulated } = req.body;
  const savedChallenge = req.signedCookies?.["passkey_challenge"];

  if (!savedChallenge) {
    res.status(400).json({ error: "Session expired or challenge missing" });
    return;
  }

  res.clearCookie("passkey_challenge");

  try {
    const { id: credentialId, response } = loginResponse;

    const [passkey] = await db
      .select()
      .from(passkeysTable)
      .where(eq(passkeysTable.credentialId, credentialId));

    if (!passkey) {
      res.status(401).json({ error: "Passkey credential not registered" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, passkey.userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!isSimulated && response?.clientDataJSON) {
      try {
        const clientData = JSON.parse(Buffer.from(response.clientDataJSON, "base64url").toString("utf-8"));
        if (clientData.challenge !== savedChallenge) {
          res.status(400).json({ error: "Challenge verification failed" });
          return;
        }
      } catch (e) {
        req.log.warn({ e }, "Failed to parse clientDataJSON during login verify");
      }
    }

    const currentCounter = passkey.counter;
    await db
      .update(passkeysTable)
      .set({ counter: currentCounter + 1 })
      .where(eq(passkeysTable.id, passkey.id));

    let companyNameVal: string | null = null;
    if (user.companyId) {
      const [c] = await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, user.companyId));
      companyNameVal = c?.name ?? null;
    }

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", user.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: isProduction,
      sameSite: "lax",
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: companyNameVal,
    });
  } catch (err: any) {
    req.log.error({ err }, "Passkey login verification failed");
    res.status(500).json({ error: err.message || "Passkey login failed" });
  }
});

// --- Device Authorization Flow Endpoints ---
router.post("/auth/device/code", async (req, res): Promise<void> => {
  try {
    const deviceCode = crypto.randomBytes(24).toString("hex");
    
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let userCode = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) userCode += "-";
      userCode += chars.charAt(crypto.randomInt(chars.length));
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db
      .insert(deviceCodesTable)
      .values({
        deviceCode,
        userCode,
        status: "pending",
        expiresAt,
      });

    const host = req.get("host") || "localhost:5173";
    const protocol = req.protocol || "http";
    const verificationUri = `${protocol}://${host.split(":")[0]}:${host.split(":")[1] || "5173"}/activate`;

    res.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      expires_in: 300,
      interval: 3,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to initialize device authorization flow" });
  }
});

router.post("/auth/device/token", async (req, res): Promise<void> => {
  const { device_code } = req.body;
  if (!device_code) {
    res.status(400).json({ error: "device_code is required" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(deviceCodesTable)
      .where(eq(deviceCodesTable.deviceCode, device_code));

    if (!record) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: "expired_token" });
      return;
    }

    if (record.status === "pending") {
      res.status(400).json({ error: "authorization_pending" });
      return;
    }

    if (record.status === "denied") {
      res.status(400).json({ error: "access_denied" });
      return;
    }

    if (record.status === "approved" && record.userId) {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, record.userId));

      if (!user) {
        res.status(400).json({ error: "invalid_grant" });
        return;
      }

      let companyNameVal: string | null = null;
      if (user.companyId) {
        const [c] = await db
          .select({ name: companiesTable.name })
          .from(companiesTable)
          .where(eq(companiesTable.id, user.companyId));
        companyNameVal = c?.name ?? null;
      }

      const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
      res.cookie("connect.sid", user.id.toString(), {
        signed: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: isProduction,
        sameSite: "lax",
      });

      res.json({
        status: "success",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: companyNameVal,
        },
      });
      return;
    }

    res.status(400).json({ error: "invalid_grant" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process token polling request" });
  }
});

router.get("/auth/device/verify-code", async (req, res): Promise<void> => {
  const userCode = req.query.user_code as string;
  if (!userCode) {
    res.status(400).json({ error: "user_code is required" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(deviceCodesTable)
      .where(eq(deviceCodesTable.userCode, userCode));

    if (!record) {
      res.status(404).json({ error: "Code not found" });
      return;
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: "Code has expired" });
      return;
    }

    res.json({
      status: record.status,
      expiresAt: record.expiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to verify code" });
  }
});

router.post("/auth/device/authorize", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { user_code, approve } = req.body;
  if (!user_code) {
    res.status(400).json({ error: "user_code is required" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(deviceCodesTable)
      .where(eq(deviceCodesTable.userCode, user_code));

    if (!record) {
      res.status(404).json({ error: "Code not found" });
      return;
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: "Code has expired" });
      return;
    }

    const finalStatus = approve ? "approved" : "denied";

    await db
      .update(deviceCodesTable)
      .set({
        status: finalStatus,
        userId: req.user.id,
      })
      .where(eq(deviceCodesTable.id, record.id));

    res.json({ success: true, status: finalStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to authorize device" });
  }
});

export default router;

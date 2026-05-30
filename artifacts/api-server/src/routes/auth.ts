import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, companiesTable, passkeysTable, deviceCodesTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody } from "@workspace/api-zod";
import crypto from "crypto";

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

// --- SSO Endpoints ---

interface SsoUserPayload {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  username: string;
}

async function authenticateOrProvisionSsoUser(payload: SsoUserPayload) {
  const { email, name, username } = payload;

  // Check if a user with this email or username already exists
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    // If not found by email, check by username (to avoid unique constraint violation)
    const [userByUsername] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));
      
    if (userByUsername) {
      user = userByUsername;
    }
  }

  if (user) {
    return user;
  }

  // Provisioning a new user and company
  const targetCompanyName = `${name}'s Workspace`;
  const targetWebsite = `https://${username.toLowerCase()}.traclytag.com`;

  // Create company
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
    throw new Error("Failed to auto-provision company workspace");
  }

  // Generate random password hash (since password_hash is notNull in usersTable)
  const randomPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  // Ensure unique username
  let finalUsername = username;
  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, finalUsername));
    
  if (existingUsername) {
    finalUsername = `${username}_${crypto.randomInt(1000, 9999)}`;
  }

  // Create client_admin user
  const [newUser] = await db
    .insert(usersTable)
    .values({
      username: finalUsername,
      email,
      phone: null,
      passwordHash,
      role: "client_admin",
      companyId: company.id,
    })
    .returning();

  if (!newUser) {
    throw new Error("Failed to auto-provision user account");
  }

  return newUser;
}

const getSuccessRedirectUrl = (req: any): string => {
  if (req.get("host")?.includes("localhost:3000") || req.get("host")?.includes("127.0.0.1:3000")) {
    return "http://localhost:5173/dashboard";
  }
  return "/dashboard";
};

const getFailureRedirectUrl = (req: any, errorMsg: string): string => {
  const prefix = (req.get("host")?.includes("localhost:3000") || req.get("host")?.includes("127.0.0.1:3000"))
    ? "http://localhost:5173"
    : "";
  return `${prefix}/login?error=${encodeURIComponent(errorMsg)}`;
};

router.get("/auth/sso/config", (req, res): void => {
  res.json({
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID,
  });
});

router.get("/auth/sso/google", (req, res): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({ error: "Google SSO is not configured on the server." });
    return;
  }
  
  const state = crypto.randomBytes(16).toString("hex");
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  
  res.cookie("oauth_state", state, {
    signed: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 10, // 10 minutes
    secure: isProduction,
    sameSite: "lax",
  });

  const redirectPrefix = process.env.SSO_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
  const redirectUri = `${redirectPrefix}/google`;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&state=${encodeURIComponent(state)}`;
    
  res.redirect(authUrl);
});

router.get("/auth/sso/callback/google", async (req, res): Promise<void> => {
  const { code, state, error } = req.query;
  const savedState = req.signedCookies?.["oauth_state"];
  res.clearCookie("oauth_state");

  if (error) {
    res.redirect(getFailureRedirectUrl(req, String(error)));
    return;
  }

  if (!code || !state || state !== savedState) {
    res.redirect(getFailureRedirectUrl(req, "Invalid state or code missing"));
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.redirect(getFailureRedirectUrl(req, "Server Google credentials are not configured"));
    return;
  }

  try {
    const redirectPrefix = process.env.SSO_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
    const redirectUri = `${redirectPrefix}/google`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange Google authorization code");
    }

    const { access_token } = tokenData;

    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = (await userinfoResponse.json()) as any;
    if (!userinfoResponse.ok) {
      throw new Error(profile.error_description || "Failed to fetch Google user profile");
    }

    const email = profile.email;
    const name = profile.name || profile.given_name || "Google User";
    const sub = profile.sub;

    if (!email) {
      throw new Error("No email returned from Google authentication");
    }

    const loggedInUser = await authenticateOrProvisionSsoUser({
      provider: "google",
      providerId: sub,
      email,
      name,
      username: email.split("@")[0] || `user_${sub.slice(-6)}`,
    });

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", loggedInUser.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: isProduction,
      sameSite: "lax",
    });

    res.redirect(getSuccessRedirectUrl(req));
  } catch (err: any) {
    req.log.error({ err }, "Google SSO callback handler failed");
    res.redirect(getFailureRedirectUrl(req, err.message || "Google authentication failed"));
  }
});

router.get("/auth/sso/github", (req, res): void => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({ error: "GitHub SSO is not configured on the server." });
    return;
  }
  
  const state = crypto.randomBytes(16).toString("hex");
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  
  res.cookie("oauth_state", state, {
    signed: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 10,
    secure: isProduction,
    sameSite: "lax",
  });

  const redirectPrefix = process.env.SSO_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
  const redirectUri = `${redirectPrefix}/github`;
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("user:email")}` +
    `&state=${encodeURIComponent(state)}`;
    
  res.redirect(authUrl);
});

router.get("/auth/sso/callback/github", async (req, res): Promise<void> => {
  const { code, state, error } = req.query;
  const savedState = req.signedCookies?.["oauth_state"];
  res.clearCookie("oauth_state");

  if (error) {
    res.redirect(getFailureRedirectUrl(req, String(error)));
    return;
  }

  if (!code || !state || state !== savedState) {
    res.redirect(getFailureRedirectUrl(req, "Invalid state or code missing"));
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.redirect(getFailureRedirectUrl(req, "Server GitHub credentials are not configured"));
    return;
  }

  try {
    const redirectPrefix = process.env.SSO_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
    const redirectUri = `${redirectPrefix}/github`;

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;
    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange GitHub authorization code");
    }

    const { access_token } = tokenData;

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { 
        Authorization: `Bearer ${access_token}`,
        "User-Agent": "TraclyTag-App"
      },
    });

    const profile = (await userResponse.json()) as any;
    if (!userResponse.ok) {
      throw new Error(profile.message || "Failed to fetch GitHub profile");
    }

    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "User-Agent": "TraclyTag-App"
      }
    });

    let email = profile.email;
    if (emailsResponse.ok) {
      const emailsList = await emailsResponse.json();
      if (Array.isArray(emailsList)) {
        const primaryEmail = emailsList.find((e: any) => e.primary && e.verified) || emailsList[0];
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
    }

    if (!email) {
      throw new Error("No public or verified email returned from GitHub");
    }

    const name = profile.name || profile.login || "GitHub User";
    const sub = String(profile.id);

    const loggedInUser = await authenticateOrProvisionSsoUser({
      provider: "github",
      providerId: sub,
      email,
      name,
      username: profile.login || email.split("@")[0],
    });

    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("connect.sid", loggedInUser.id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: isProduction,
      sameSite: "lax",
    });

    res.redirect(getSuccessRedirectUrl(req));
  } catch (err: any) {
    req.log.error({ err }, "GitHub SSO callback handler failed");
    res.redirect(getFailureRedirectUrl(req, err.message || "GitHub authentication failed"));
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

# Single Sign-On (SSO) Integration & Setup Guide

This guide explains how to configure actual Single Sign-On (SSO) using Google and GitHub OAuth 2.0 in the TraclyTag application.

---

## 1. Google OAuth 2.0 Configuration

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top-left and select **New Project**.
3. Name your project (e.g., `TraclyTag`) and click **Create**.

### Step 2: Configure OAuth Consent Screen
1. In the left navigation pane, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** User Type and click **Create**.
3. Fill in the required fields:
   - **App name**: `TraclyTag`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. In the **Scopes** step, click **Add or Remove Scopes** and add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Click **Save and Continue** through the remaining steps.

### Step 3: Create OAuth 2.0 Credentials
1. In the left navigation pane, go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Choose **Web application** for **Application type**.
4. Set the name to `TraclyTag Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
6. Under **Authorized redirect URIs**, add the callback URL:
   - `http://localhost:5173/api/auth/sso/callback/google`
7. Click **Create**.
8. Copy your **Client ID** and **Client Secret**.

---

## 2. GitHub OAuth Configuration

### Step 1: Create a New GitHub OAuth App
1. Log into your GitHub account and go to **Settings** (click your profile photo in the top-right -> **Settings**).
2. Scroll down on the left sidebar and click **Developer Settings**.
3. Select **OAuth Apps** and click **New OAuth App** (or **Register a new application**).
4. Fill in the fields:
   - **Application name**: `TraclyTag`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/api/auth/sso/callback/github`
5. Click **Register application**.

### Step 2: Generate Client Secret
1. On the app management page, copy the **Client ID**.
2. Click **Generate a new client secret**.
3. Copy the generated **Client Secret** (make sure to copy it now, it will only be shown once).

---

## 3. Enable SSO in TraclyTag

To activate these SSO connections, create a `.env` file at the root of the project workspace (`c:\Users\Keval\Documents\tracelytag\tracly-tag-final\.env`) and paste your credentials:

```env
# Session signing key
SESSION_SECRET=your-random-session-secret-key-here

# Google Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret-here

# GitHub Credentials
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
```

Restart your backend server to load the new `.env` settings:
```bash
pnpm --filter @workspace/api-server run dev
```

---

## 4. How Auto-Provisioning Works
When a new user signs in via Google or GitHub SSO for the first time:
1. TraclyTag fetches their verified primary email address, username, and profile name.
2. A new organization workspace is automatically created named `[User Name]'s Workspace`.
3. The user is registered and designated as the **Client Admin** of this new workspace.
4. A random password hash is generated and saved to satisfy Drizzle schemas.
5. The session is established automatically, redirecting the user to `/dashboard`.

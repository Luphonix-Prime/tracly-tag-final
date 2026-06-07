# TraclyTag: Mapping Code Feature (Mobile APK Target)

This document provides a detailed breakdown of the **Mapping Code** feature, detailing its UI flows, the exact source code files that implement it, its database/API specifications, and a complete implementation guide for packaging and compiling this feature into a standalone Android APK.

> [!IMPORTANT]
> **Centralized Shared Backend & Real-time Web Synchronization**
> The mobile application (compiled as an APK) connects directly to the **same centralized API server** as the main TraclyTag desktop website.
> * Any action performed on the mobile APK (such as mapping or scanning a QR code) instantly mutates the shared database.
> * All updates are reflected **immediately in real time** on the main website's dashboard, audit logs, and reports, as both platforms communicate with the same backend services.

---

## 1. UI Flow & Feature Descriptions

The **Mapping Code** module is an industrial-focused console designed for line operators to physically associate GS1 codes (Unit-level Serials or SSCC Shipper Codes) with physical items. The UI contains three main elements: the dashboard, the status audit log, and the active mapping wizard.

### A. Main Dashboard Console
*   **Search & Filtering Bar**: 
    *   **Text Search**: Real-time filtering of product list by Product Name or Batch Number.
    *   **Dropdown Filters**: Selectable Product Name and associated Batch selectors. Includes a reset button.
    *   **Export Button**: Allows one-click XLSX download of the batch mapping status report.
*   **Batch Status & Progress Grid**: A table displaying:
    *   **Product Name**: Name of the drug/device being mapped.
    *   **Batch Name**: Monospaced unique batch identifier (e.g., `BTCH-2024-001`).
    *   **Total QR**: Total codes pre-generated for the batch.
    *   **Mapped QR**: Count of codes marked as physically mapped/assigned.
    *   **Remaining QR**: Quantity of unmapped codes remaining.
    *   **Efficiency Badge**: Color-coded percentage indicator (e.g., Green `100%` for complete batches, Amber/Orange for incomplete batches).
    *   **Action Buttons**: 
        *   `Eye` Icon: Initiates the Step-by-Step Operator Mapping Wizard for the selected batch.
        *   `View Status` (`ClipboardList` icon): Opens the detailed audit log modal.

### B. Mapping Status Audit Log (Popup Modal)
*   **Quick Metric Cards**: Displays total codes, mapped codes (green highlight), and pending codes (gray highlight).
*   **Filter Tabs**: Filter the audit view between "All Codes", "Mapped", and "Pending".
*   **Audit List**: Lists individual serial codes, showing:
    *   Monospaced code identifier (Serial Number or SSCC).
    *   Mapping metadata (timestamp of mapping, username of the operator who scanned it, and specific warehouse location).
    *   Visual status pill (`Mapped` in Green vs. `Pending` in Amber).

### C. Step-by-Step Operator Mapping Wizard (Active Terminal)
Designed with a dark, high-contrast industrial interface (`bg-slate-900` / `text-slate-100`) optimized for readability on handheld warehouse devices:

1.  **Step 1: Operator Authorization**
    *   Operator ID (text input) & Access Token input (with show/hide password toggle).
    *   **Simulated Biometric Sign-In**: Quick authorization buttons for **Touch ID** and **Face ID** that instantly validate operator credentials for faster line setups.
2.  **Step 2: Shipper Context Configuration**
    *   Displays readonly Product and Batch information.
    *   Selectable Mapping Location (fetched dynamically from the locations table).
    *   Selectable Shipper Unit Capacity (e.g., "1 Shipper Box (10 QRs)", "5 Shippers (50 QRs)", "10 Shippers (100 QRs)").
3.  **Step 3: Active Scanning Terminal**
    *   **Device Camera vs. Scanner Machine Tabs**:
        *   **Device Camera Mode**: Initializes a live viewfinder scan area using the device's built-in camera. Includes:
            *   Dynamic camera selector list (enumerates all front/back video inputs using `navigator.mediaDevices`).
            *   Viewfinder box with glowing corner crosshairs and a moving green laser scan line animation.
            *   Auto-focus scan overlay showing "Registering Code..." when processing.
            *   Success beep sound effect synthesized programmatically using the browser's Web Audio API.
        *   **Scanner Machine Mode**: Optimized for USB/wireless scanning guns. Provides a single text entry field that auto-focuses. When a gun triggers a barcode scan, it appends an 'Enter' character to submit and verify the code instantly.
    *   **Progress Dashboard**: Displays location info, mapped fraction (`X / Y`), and a smooth, rounded progress bar showing completed percentage.
    *   **Simulation Controls**:
        *   *Auto-Scan (Demo)*: Periodic timer mapping one pending code every 850ms, playing sound effects and flashing scan verification states. Useful for demonstrating the terminal layout without physical scanning hardware.
        *   *Manual Scan*: Manually maps the next pending code in sequence.
4.  **Step 4: Batch Mapping Finalized Receipt**
    *   Success animation (pulsing green check circle).
    *   Receipt Details: Monospaced summary containing Product ID, Batch Code, Location Name, Operator ID, QR Association ratio, and precise mapping timestamp.
    *   *Print Receipt*: Triggers a simulated print spooling state.
    *   *Return to Console*: Clears authorization state, closes wizard, and updates the dashboard grid.

---

## 2. Core Code Files Mapping

To isolate and build the **Mapping Code** feature into an APK, compile only the following source files and client libraries:

### A. Frontend Application (Vite/React Workspace)
*   **Active View / Page**:
    *   `[page] mapping-code.tsx` → [artifacts/traclytag/src/pages/mapping-code.tsx](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/artifacts/traclytag/src/pages/mapping-code.tsx)
        *   *Contains mapping dashboard layout, modal wizards, biometric buttons, Beep sound synthesizer, camera stream initializer, and USB scanner inputs.*
*   **Routing & Entry Points**:
    *   `[root] App.tsx` → [artifacts/traclytag/src/App.tsx](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/artifacts/traclytag/src/App.tsx)
        *   *Configure `/` or `/mapping-code` paths to route directly to the mapping console page.*
    *   `[entry] main.tsx` → [artifacts/traclytag/src/main.tsx](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/artifacts/traclytag/src/main.tsx)
*   **Styles & Configuration**:
    *   `[css] index.css` → [artifacts/traclytag/src/index.css](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/artifacts/traclytag/src/index.css)
        *   *Provides Tailwind variables, fonts, scanner anims, layout classes.*
    *   `[config] vite.config.ts` → [artifacts/traclytag/src/vite.config.ts](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/artifacts/traclytag/vite.config.ts)
        *   *Vite bundle configs for mobile assets.*

### B. Shared Client Libraries
*   **API Client React Hook Library**:
    *   `[hook-exports] index.ts` → [lib/api-client-react/src/index.ts](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/lib/api-client-react/src/index.ts)
    *   `[api-requests] generated/api.ts` → [lib/api-client-react/src/generated/api.ts](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/lib/api-client-react/src/generated/api.ts)
        *   *Defines `useGetProductReport`, `useListProducts`, `useListBatches`, `useListLocations` hooks.*
    *   `[api-schemas] generated/api.schemas.ts` → [lib/api-client-react/src/generated/api.schemas.ts](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/lib/api-client-react/src/generated/api.schemas.ts)
    *   `[token-helper] custom-fetch.ts` → [lib/api-client-react/src/custom-fetch.ts](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final/lib/api-client-react/src/custom-fetch.ts)
        *   *Provides `setBaseUrl` and auth header injection used to connect the APK to the remote server.*

### C. Major Third-Party Dependencies (`package.json`)
*   `html5-qrcode` (Enables web-based QR scanning via camera. Dynamically imported inside the mapping wizard).
*   `lucide-react` (Vector UI icons).
*   `sonner` (Toast feedback overlays).
*   `@tanstack/react-query` (Server cache manager).
*   `wouter` (Lightweight routing).

---

## 3. Backend API Endpoints & Database Integration

When the APK runs on a mobile device, it communicates over HTTP directly with the **shared production API server** (the exact same backend powering the desktop website). This shared backend structure guarantees that mobile scanner mutations instantly sync with the desktop site. Below are the key endpoints and database entities that power this feature.

### A. Endpoint Mappings (Located in `artifacts/api-server/src/routes/codes.ts`)
1.  **GET `/api/codes/report`** (mapped in `useGetProductReport`)
    *   *Role*: Retrieves summary data of all batches, including product names, batch numbers, total code count, mapped count, and unmapped count.
2.  **GET `/api/codes`** (mapped in `useListBatches` / `useListLocations`)
    *   *Role*: Lists all pre-generated code structures under the current batch. Used to load the local `codesList` state in the mapping terminal.
3.  **POST `/api/codes/:id/map`**
    *   *Role*: Marks a specific code identifier as mapped, records the operator user ID, records location ID, and stamps the database timestamp.
    *   *Payload*: `{ locationId: number }`
    *   *Response*: Returns the fully enriched code data object.

### B. Database Schema Models (Located in `lib/db/src/schema/codes.ts`)
The mapping logic directly mutates the `codesTable` schema:
*   `id` (integer, Primary Key)
*   `productId` (integer, reference to `productsTable`)
*   `batchId` (integer, reference to `batchesTable`)
*   `level` (text - e.g., 'unit', 'shipper')
*   `rawString` (text - unique GS1 barcode string)
*   `serialNumber` (text - nullable serial number)
*   `ssccCode` (text - nullable SSCC barcode)
*   `mapped` (boolean - set to `true` upon scan)
*   `mappedAt` (text - ISO string timestamp of the mapping operation)
*   `mappedByUserId` (integer - links to the scanning operator user ID)
*   `locationId` (integer - reference to the warehouse mapping location ID)

---

## 4. Mobile APK Compilation & Integration Guide

Because the application is built using React and Vite, you can use **Capacitor** (by Ionic) to wrap the React codebase into a native Android application container and compile a deployable `.apk` file.

### Step 1: Install Capacitor in the `traclytag` Project
Open the terminal in `artifacts/traclytag` and install Capacitor core and CLI:
```bash
cd artifacts/traclytag
npm install @capacitor/core @capacitor/cli
```

### Step 2: Initialize the Capacitor Configuration
Initialize Capacitor, providing the application name and package ID:
```bash
npx cap init TraclyTag com.traclytag.app --web-dir=dist
```
*Note: Make sure `--web-dir` matches Vite's build directory (`dist` as configured in `vite.config.ts`).*

### Step 3: Add the Android Platform
Install the native Android adapter and add the platform folder:
```bash
npm install @capacitor/android
npx cap add android
```

### Step 4: Configure Remote API Endpoint Base URL
Since the APK runs locally on the phone, relative proxy paths (like `/api/...` mapped in Vite) will fail. You must configure the API client to point directly to your live production server URL.

In your React application entry point (e.g. `App.tsx` or `main.tsx`), initialize the base API URL:
```typescript
import { setBaseUrl } from "@workspace/api-client-react";

// Point this to your live production backend server address
const PRODUCTION_API_URL = "https://your-production-server-url.com";

setBaseUrl(PRODUCTION_API_URL);
```

### Step 5: Configure Android Camera Permissions
To use the camera scanner on mobile device viewfinders, you must add camera permission requests to the Android config files.

1. Open `artifacts/traclytag/android/app/src/main/AndroidManifest.xml`.
2. Add the following permissions inside the `<manifest>` tag:
```xml
<!-- Camera Permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### Step 6: Build the React Code & Sync with Android Studio
Build the production-ready assets and sync them to the Capacitor Android project:
```bash
npm run build
npx cap sync
```

### Step 7: Compile the APK using Android Studio
Launch Android Studio to build and compile the APK package:
```bash
npx cap open android
```
Inside Android Studio:
1. Wait for Gradle to finish syncing.
2. Select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)** in the top menu.
3. Once completed, a popup will display: *"APK(s) generated successfully."*
4. Click **Locate** to retrieve the compiled debug APK file (`app-debug.apk`) to install on Android devices.

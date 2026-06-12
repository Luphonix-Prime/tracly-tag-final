# TraclyTag: Mobile API Synchronization & Real-time Live Database Guide

This guide details how to configure the TraclyTag mobile application to connect directly with the central API server running in your main development repository [tracly-tag-final](file:///c:/Users/Keval/Documents/tracelytag/my-merger/tracly-tag-final). 

By connecting the mobile app to the live backend, scanning/mapping operations on the mobile console will instantly write to the central database and update the web dashboard in real time.

---

## 1. Prerequisites

1. **Start the API Server**:
   Ensure the backend API server is actively running in the main workspace directory. You can start it using:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```
   *By default, the server runs on `http://localhost:3000`.*

2. **Open the Web Console**:
   Launch the web dashboard in your browser (`http://localhost:5173` or similar) and log in.

---

## 2. Step-by-Step Configuration on the Mobile Application

Open the mobile app on your emulator or physical device. On the main dashboard, perform the following steps:

```
+-------------------------------------------------------+
|  TRACLY Drug Serialization Terminal       [CLOUD MODE] <--- Step 1: Tap to change to CLOUD
|  API: http://10.0.2.2:3000/api...        Configure API <--- Step 2: Tap to expand settings
+-------------------------------------------------------+
|  [ Server Base URL ]                                  |
|  http://10.0.2.2:3000/api                              <--- Step 3: Enter Endpoint URL
|                                                       |
|  [ API Authorization Token ]                          |
|  demo_op                                               <--- Step 4: Enter Role Token
|                                                       |
|  [ Pull API Products ] (Syncs codes/batches)           <--- Step 5: Pull live data
+-------------------------------------------------------+
```

### Step 1: Switch to CLOUD MODE
In the top-right header, tap on the **OFFLINE MODE** pill. It will switch and turn green, reading **CLOUD MODE**. This instructs the app to attempt live network synchronization on write actions.

### Step 2: Access API Configuration
Click the orange/blue **"Configure API"** text button in the top header card to expand the settings panel.

### Step 3: Retrieve and Enter the Server Base URL
Copy the base URL of your running backend:
- **For physical devices on the same local network**: Enter `http://<your-host-computer-ip>:3000/api`.
- **For Android Emulator (Android Studio)**: Enter **`http://10.0.2.2:3000/api`**. 
  > [!IMPORTANT]
  > When running inside the Android Emulator, `localhost` or `127.0.0.1` refers to the loopback interface of the emulator itself. To connect to the host computer's backend server, you must use `http://10.0.2.2:3000/api`.

### Step 4: Retrieve and Enter the Authorization Token
Copy the appropriate API Authorization Token based on the user's role on the main web dashboard:
- **Token options**:
  - `master` (for Master Admin context)
  - `demo_admin` (for Client Admin context)
  - `demo_op` (for operator context)
- *Note: You can copy these directly from the left sidebar footer of the web dashboard.*

### Step 5: Pull Live Database Records
Click the **"Pull API Products"** button. The app will:
1. Make a handshake call to the live server.
2. Download all active Products, Batches, and pre-generated QR Serial codes.
3. Save/cache them locally so you can work dynamically.
*Upon success, a green success banner will indicate synchronization completed.*

## 3. Mapping Codes and Verifying Real-Time Synchronization

Once the mobile application is connected in **CLOUD MODE** and data has been pulled, you can map the generated codes using the mobile terminal wizard. The mobile app provides three ways to execute mapping, all of which instantly synchronize with the server database:

### A. Executing Mapping on the Mobile App
1. **Open the Terminal**: Tap the **"Map Terminal"** button next to a batch on the mobile dashboard.
2. **Authorize and Configure**: Proceed past the operator sign-in and select your location context.
3. **Trigger Mapping Action**:
   - **Method 1: Simulated Camera Scanner (Auto-Scan)**:
     Under the **Camera** tab, tap the **"START DEMO CAMERA"** button. This initializes the live viewfinder animation sweep and automatically maps one pending code from the server list every 850ms.
   - **Method 2: Manual Row Mapping**:
     Scroll down to the *"SERIAL CODES IN CURRENT AGGREGATION BLOCK"* table. Click the orange **Play Arrow button** next to any specific pending code to simulate scanning it.
   - **Method 3: De-Nest Sweep (Manual Sweep)**:
     Tap the **"DE-NEST SWEEP"** button in the Camera controls to manually map the next pending code in sequence.
   - **Method 4: Scanner Gun (Keyboard Input)**:
     Switch to the **Scanner Gun** tab, type or paste the code's raw serial string, and press Enter to search and map.

### B. Verification on the Web Console
- **API Request**: When any of the actions above are triggered in **CLOUD MODE**, the mobile app makes a `POST /api/codes/:id/map` call to the live server.
- **Real-Time Dashboard Updates**: Keep the central web dashboard open on the **Mapping Code** page. The batch progress charts, mapped counts, and efficiency percentages will update in real time as the mobile app maps the codes.
- **Audit Logs**: Click **"View Status"** next to the batch on the web console. The details modal will display the exact operator ID, warehouse location, and mapping timestamp recorded by the mobile app.

# SmartWaste — Stable Demo-Ready Municipal Waste Management Platform

> **Municipal Platform & Hackathon MVP** for Smart Waste Collection across Panchayats, Villages, and Municipalities.

SmartWaste transitions waste management from rigid schedule-based collection toward **dynamic demand-driven collection** powered by real-time citizen reports, IoT smart bins, automated explainable priority scoring, geotagged camera verification, and worker attendance accountability logs.

---

## 🔑 Demo Credentials & Quick Role Access

| Role | Email / Quick Access | Purpose & Features |
| :--- | :--- | :--- |
| **Citizen** | Quick Switcher -> `Citizen` | Geotagged waste reporting, GPS picker, status timeline tracking, missed collection scheduling. |
| **Worker (Driver)** | `worker@smartwaste.local` / Quick Switcher | Vehicle route navigation, `START` -> `ARRIVE` -> `COLLECT` -> `VERIFY` (with Geotag Photo proof). |
| **Admin Control** | `admin@smartwaste.local` / Quick Switcher | Live Leaflet GIS map, route dispatch, priority queue, AI demand predictions, worker attendance audit log. |

---

## 🌟 Core Features by Role

### 1. Citizen Portal (`/citizen`)
- **Geotag Camera & Waste Reporting**: Capture/upload waste photos with embedded GPS coordinates, timestamp, and landmark watermark.
- **GPS State Resilience**: Supports requesting permission, success, permission denied, timeout, retry, and manual coordinate entry fallback.
- **Durable Status Timelines**: Live status tracking across `Submitted` -> `Assigned` -> `In Progress` -> `Collected` -> `Verified` (or `Rejected`).
- **Missed Collection Reporting**: Dedicated workflow for reporting overdue or missed Panchayat bin pickups.

### 2. Worker / Driver App (`/driver`)
- **Seeded Demo Route & Vehicle**: Pre-assigned vehicle (`TN-37-EV-2024`) with ordered collection stops, distance (KM), and weight capacity (KG).
- **Controlled Workflow**: Enforced sequence (`Start Route` -> `Arrive` -> `Collect` -> `Geotag Proof Upload` -> `Mark Collected`).
- **Watermarked Geotag Photo Proof**: Captures live Lat/Lng, timestamp, worker ID, and vehicle ID burned into the verification image file.
- **Worker Attendance & Shift Tracking**: Clock-in timestamps and verified task completions.

### 3. Admin Control Room (`/admin`)
- **Consistent Live Dashboard Counts**: Single source of truth for total collection points, critical bins (>85% fill), active vehicles, pending reports, and overdue stops.
- **Interactive Leaflet & OSM Map**: Real-time bin fill markers, report pins, route polylines, legend filters, and tile fallback UI.
- **Worker Attendance & Accountability Audit**: Table view auditing worker clock-ins, assigned route execution progress, and geotagged collection proof photos.
- **Explainable Priority Scoring**:
  - `0 – 30`: Low
  - `31 – 55`: Medium
  - `56 – 75`: High
  - `76 – 100`: Critical
  - *85%+ Fill Level Guarantee*: Automatically elevated to Critical (76-100) priority with human-readable score explanation.

---

## 🧠 Priority Engine Formula

$$\text{Priority Score} = (\text{Fill Level \%} \times 0.40) + (\text{Time Elapsed} \times 0.25) + (\text{Citizen Complaints} \times 0.20) + (\text{Location Sensitivity} \times 0.15) + \text{Overdue Boost}$$

- **Location Sensitivity Scores**:
  - Hospital / Clinic: `100 pts`
  - School / College: `90 pts`
  - Transit Hub / Bus Stand: `80 pts`
  - Market / Bazaar: `75 pts`
  - Commercial Area: `55 pts`
  - Residential / Village Ward: `40 pts`

---

## 🔄 End-to-End Scenario Verification Checklist

To test the complete end-to-end municipal collection scenario:

1. **Citizen Submission**:
   - Open `/citizen/report`.
   - Use the **Geotag Camera** to capture or select a photo (verify Lat/Lng & timestamp watermark).
   - Enter landmark `Narasipuram Main Road` and submit.
2. **Admin Review & Route Assignment**:
   - Open `/admin`.
   - Observe the new report appearing in real time on the **Admin Map** and report queue.
   - Open `/admin/routes` and assign the report to driver `Ramesh Patel` (`TN-37-EV-2024`).
3. **Worker Execution & Proof Upload**:
   - Open `/driver/route`.
   - Click **Start Route** -> **Arrive** -> **Collect**.
   - Snap a **Geotagged Verification Photo** (with burned-in Lat/Lng & timestamp) and click **Verify & Complete Stop**.
4. **Admin Verification & Attendance Audit**:
   - Open `/admin`.
   - Check the **Worker Attendance & Accountability Audit Log** to inspect the verified geotag photo and clock-in status.
5. **Citizen Timeline Confirmation**:
   - Open `/citizen/reports`.
   - Verify status timeline advances to **Collected & Verified**.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS 3, Lucide Icons, Recharts, Leaflet.js / OpenStreetMap.
- **Backend & Realtime**: Supabase Cloud (PostgreSQL Database), Supabase Realtime (WebSockets), Supabase Auth (RBAC), `@supabase/ssr`.
- **PWA & GIS**: Web App Manifest, Service Worker (`sw.js`), OSRM Routing API, Geotag HTML5 Canvas Engine.
- **Deployment**: Vercel Edge Network.

---

## 🚀 Quick Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run TypeScript Check & Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

3. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

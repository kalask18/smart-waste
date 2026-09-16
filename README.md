# SmartWaste - Demand-Driven Smart Waste Collection System

> **Hackathon MVP** for Smart Waste Collection across Panchayats, Villages, and Municipalities.

SmartWaste transitions waste management from rigid schedule-based collection toward **dynamic demand-driven collection** powered by real-time citizen reports, IoT smart bins, automated priority scoring, and driver route optimization.

---

## 🌟 Core Features & Roles

### 1. Citizen Portal (`/citizen`)
- **Waste Reporting**: Upload photos, pinpoint exact coordinates on an interactive map, select waste categories (Organic, Recyclable, Hazardous, Construction, Overflowing Bin), and specify location type.
- **Real-Time Status Tracking**: Live updates as waste progresses from `Pending` → `Assigned` → `Collected` → `Verified`.

### 2. Driver / Worker App (`/driver`)
- **Mobile-Optimized Portal**: View assigned collection routes with sequential stops ordered by priority and route efficiency.
- **Interactive Stop Management**: Mark arrival, record waste collected, and upload verification proof photos.

### 3. Admin Control Room (`/admin`)
- **Live GIS Map**: View active waste reports and IoT smart bins color-coded by priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Dynamic Route Generator**: Auto-generate optimized driver routes based on location criticality and OSRM route calculations.
- **Smart Analytics & Predictions**: Missed collection detection, waste hotspot analysis, and regional waste demand forecasting.

---

## 🧠 Smart Priority Engine

Waste priority scores (0 - 100) are dynamically calculated using:

$$\text{Priority Score} = (\text{Base Severity} \times \text{Location Multiplier}) + \text{Time Urgency Bonus} + \text{Upvote Bonus}$$

- **Location Multipliers**:
  - Hospital: `2.0x`
  - School: `1.8x`
  - Transit Hub: `1.5x`
  - Market: `1.4x`
  - Residential: `1.0x`
- **Priority Thresholds**:
  - `CRITICAL` ($\ge 80$)
  - `HIGH` ($60 - 79$)
  - `MEDIUM` ($35 - 59$)
  - `LOW` ($< 35$)

---

## 🛠 Tech Stack

- **Frontend**: Next.js App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Leaflet / OpenStreetMap.
- **Backend**: Next.js Server Actions & API routes.
- **Database & Storage**: Supabase PostgreSQL + Supabase Storage.
- **IoT Ready**: API route `/api/iot/bin-data` for ESP32 + Ultrasonic + Load Cell sensors.

---

## 🚀 Quick Setup Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://hwevzebjrzdwztjpbyeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_DEMO_MODE=true
```

### 3. Run Database Migrations
Execute the SQL script in `supabase/schema.sql` in your Supabase SQL Editor to create tables, indexes, and storage buckets.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 Primary Demo Scenario

1. A citizen reports overflowing waste near **Narasipuram Main Road**.
2. Priority Engine calculates **CRITICAL** priority (School multiplier 1.8x + massive volume).
3. The report immediately renders on the Admin GIS Map.
4. Admin generates a dynamic collection route and dispatches it to Driver Ramesh Patel.
5. Driver receives the task on the mobile Driver App, marks arrival, collects waste, and uploads proof.
6. Admin dashboard updates location to **Completed / Verified**, and analytics update in real time.

# 🍲 Share-Meal: Geo-Based Food Redistribution

**Share-Meal** is a mission-driven platform designed to bridge the gap between surplus food and those in need. By connecting donors (restaurants, hotels) with local NGOs in real-time using geographic proximity, we ensure that perfectly good food reaches people instead of landfills.

---

## 🚀 Mission & Vision
In a world where 1/3 of all food is wasted, Share-Meal leverages modern technology to create a zero-waste ecosystem. Our goal is to make food redistribution as seamless as ordering a ride-share.

### Core Philosophy: "Build for the Now, Design for the Future"
We prioritize **flexibility over rigid structure**. Our database uses a flexible `food_type` system instead of rigid categories, allowing donors to quickly list items like "Veg Biryani" or "Fresh Bread" without friction.

---

## ✨ Key Features

### 🏢 For Donors (Hotels & Restaurants)
*   **Quick Listing:** Post surplus food in seconds with a photo, quantity, and expiry time.
*   **Approval Workflow:** Review pickup requests from nearby NGOs and approve the most suitable one.
*   **Donation History:** Review actual active, claimed, and expired donation records.

### 🏛️ For Receivers (NGOs)
*   **Geo-Discovery:** A real-time map view of available food within a customizable radius (e.g., 5km).
*   **Instant Alerts:** Push notifications whenever new food is listed in your area.
*   **Streamlined Claiming:** Request pickups with one tap and coordinate logistics directly through the app.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo) |
| **Backend** | Node.js / Express.js |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **Auth** | Supabase Auth (email/password) |
| **Maps** | Google Maps on native; Leaflet/OpenStreetMap on web |
| **Notifications** | Expo Notifications + Firebase (FCM) |
| **Storage** | Supabase Storage (Bucket: `food_images`) |

---

## 🧩 Database & Geo-Logic
We use **PostGIS** (PostgreSQL's spatial extension) to handle location data with high precision.

*   **Spatial Queries:** NGOs only see food within their `notification_radius_km`.
*   **Dynamic Location Triggers:** Every time a donor or food item is added, a database trigger automatically updates its `GEOGRAPHY(POINT, 4326)` field for lightning-fast distance calculations.
*   **Flexible Schema:**
    *   `food_type`: TEXT (Flexible entries like "30 Plates Veg Biryani")
    *   `expiry_time`: TIMESTAMPTZ (UTC expiry for food safety)
    *   `status`: ENUM (available, pending, claimed, expired)

---

## 📂 Project Structure
```text
share-meal/
├── app/                    # Expo Router pages & layout
├── assets/                 # App icons, splash screens, and images
├── components/             # Reusable UI (Buttons, Maps, Cards)
├── constants/              # Theme (Colors, Typography) & Config
├── hooks/                  # Custom logic (useLocation, useDonations)
├── scripts/                # Database migration and seed scripts
├── schema.sql              # Supabase/PostgreSQL database schema
└── package.json            # Project dependencies
```

---

## 🚦 Getting Started
1.  **Clone the Repo:** `git clone ...`
2.  **Install Dependencies:** `npm install`
3.  **Configure the app:** Copy `.env.example` to `.env` in this folder. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`, and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. For an Android emulator, `http://10.0.2.2:3000` reaches a backend running on your computer. For a physical phone, use your computer's LAN IP or a deployed API URL. Rebuild the native app after changing the Maps key.
4.  **Configure the backend:** Copy `../backend/.env.example` to `../backend/.env`, then set the same Supabase URL and the project's service role key. Keep the service role key in the backend only.
5.  **Setup Supabase:** For a new database, run `schema.sql` once, then use `node ../backend/scripts/migrate.js <private-token-file>` from this folder. The runner applies migrations 001–005 and the backend storage migration in one transaction. Existing databases use the same runner. See `../backend/README.md` for permissions and notification delivery details.
6.  **Run locally:** Start the backend from `../backend` with `npm install` and `npm start`, then start Expo from this folder with `npx expo start`.

Remote push is Android-only. It needs the linked EAS project and Firebase Cloud Messaging credentials. Android remote push requires a development or production build; it is unavailable in Expo Go. Inbox notifications remain available on iOS and web.

The app is linked to `@anirudhqwerty1/share-meal` in EAS. `eas.json` defines development, preview, and production profiles; no build or release is automatic. The configured identifiers are `com.anirudh.sharemeal` on Android and iOS. Push imports are disabled outside Android development/production builds. A notification tap waits for authentication before opening the inbox.

For Android Firebase setup:

1. Register the Android app in Firebase with package `com.anirudh.sharemeal`.
2. Put its `google-services.json` in this app folder, beside `app.json`. The dynamic config uses it automatically when present, and `.easignore` includes it in the EAS build upload while keeping it out of Git. `GOOGLE_SERVICES_JSON` (EAS file variable) or `GOOGLE_SERVICES_FILE` can override the path.
3. Upload the Firebase service-account JSON for FCM v1 to the linked EAS project's Android push credentials using `eas credentials --platform android`. This private key is separate from `google-services.json`; do not put it in the mobile bundle or Git.
4. Build and install an Android development/preview app, allow notifications, and test a pickup update. No notification worker or cron is needed.

Run `npm run typecheck`, `npm run lint`, and `npx expo export --platform android --max-workers 2` or `--platform web` before release. Two workers avoid excessive memory use on machines with many CPU cores. SDK 54 still has upstream dependency audit findings; do not force an incompatible SDK upgrade through `npm audit fix --force`.

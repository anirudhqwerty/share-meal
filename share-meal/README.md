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
*   **Impact Tracking:** See how many meals you've saved and the number of people helped.

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
| **Auth** | Supabase Auth (OTP/Email) |
| **Maps** | Google Maps API / react-native-maps |
| **Notifications** | Expo Notifications + Firebase (FCM) |
| **Storage** | Supabase Storage (Bucket: `food_images`) |

---

## 🧩 Database & Geo-Logic
We use **PostGIS** (PostgreSQL's spatial extension) to handle location data with high precision.

*   **Spatial Queries:** NGOs only see food within their `notification_radius_km`.
*   **Dynamic Location Triggers:** Every time a donor or food item is added, a database trigger automatically updates its `GEOGRAPHY(POINT, 4326)` field for lightning-fast distance calculations.
*   **Flexible Schema:**
    *   `food_type`: TEXT (Flexible entries like "30 Plates Veg Biryani")
    *   `expiry_time`: TIMESTAMP (Critical for food safety)
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
3.  **Setup Supabase:** Run `schema.sql` in your Supabase SQL Editor.
4.  **Run Locally:** `npx expo start`
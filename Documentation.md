# InsureWise — Comprehensive Developer Documentation

Welcome to the definitive guide for **InsureWise**. This document outlines the architecture, data models, entity relationships, and core workflows of the InsureWise Insurance Management System.

---

## 1. Technical Stack Overview

InsureWise is a lightweight, monolithic web application built entirely on standard, reliable web technologies. It avoids complex build steps and component compilation for simplicity and speed.

- **Frontend:** Pure HTML5, vanilla JavaScript, and Tailwind CSS (via CDN). No frontend frameworks (React/Vue/Angular) are used, making the UI highly portable and immediately runnable in any modern browser.
- **Backend:** Node.js powered by Express.js. A single `server.js` file handles routing, API orchestration, and business logic execution.
- **Database:** Relational MySQL database holding strict schema constraints and leveraging raw SQL scripts (`database.sql`, `dummy_data.sql`).
- **Communication:** Vanilla JS `fetch()` requests asynchronously link the frontend UI to the RESTful backend endpoints (`http://localhost:3000`).

---

## 2. Database Schema & Architecture

The database `dbms_project` is divided into highly normalized, distinct tables securely interconnected with constraints and **Foreign Keys** with cascading delete behavior.

### 2.1 Core Entities

1. **`users`**
   - **Fields:** `id`, `full_name`, `email`, `password_hash`, `role` (`customer` or `admin`).
   - Represents all platform accounts. Admin accounts orchestrate the platform; customer accounts consume services.

2. **`insurance_plans`** (The Catalog)
   - **Fields:** `id`, `name`, `type`, `premium_amount`, `duration_days`, `renew_warning_days`.
   - The master templates created by the admin indicating what coverages InsureWise is actively selling. `type` dictates the shape of the data required at purchase (`health`, `motor`, `life`).

3. **`policies`** (Purchased Contracts)
   - **Fields:** `id`, `user_id`, `plan_id`, `end_date`, `status` (`active`, `renew_soon`, `expired`).
   - Whenever a user clicks *"Purchase Plan"*, a record is spawned here. This defines the active lifecycle timeline of the purchase. 

4. **`policy_details`** (Type-Specific Data)
   - **Fields:** `policy_id`, `patient_name`, `vehicle_number`, `nominee_name`, `nominee_user_id`, etc.
   - Connected `1-to-1` with `policies`. Forms highly contextual info depending on whether it's a Motor accident cover, Life inheritance, or Health coverage.

5. **`claims`** & **`claim_payout_details`**
   - Represents a financial request from a customer. Tracks incident descriptions and estimated costs, while `claim_payout_details` strictly records bank routes (Account info, IFSC).

6. **`policy_feedback`**
   - Stores 1-to-5 star ratings and textual comments linking `user_id` to `plan_id`.

### 2.2 Security via Database Triggers & Constraints

Instead of strictly relying on NodeJS logic, logic is baked identically into the Database layer ensuring maximum security against direct modifications.
- **`trg_no_claim_on_expired`**: MySQL Trigger entirely rejects `INSERT INTO claims` if the connected policy's `end_date` is in the past.
- **`trg_claim_within_limit`**: MySQL Trigger actively blocks any incoming claim if its `estimated_amount` is greater than the purchased policy's boundary limit.
- **`CHECK` Constraints**: Enforce durations (`duration_days > 0`), valid warnings (`renew_warning_days < duration`), valid payouts (`estimated_amount > 0`).

---

## 3. Core Functional Workflows

### 3.1 Plan Creation & Management (Admin UI)
- Admins log into the `/admin-plans.html` UI. They can forge new plans with customized lengths, such as a "90-Day Temporary Vehicle Cover". 
- Admins configure the `renew_warning_days` so the system knows precisely when a policy transitions from `active` to `renew_soon` to aggressively notify customers.

### 3.2 The Policy Purchase Funnel
1. A user browses `policies.html` (The Catalog). The backend (`GET /api/plans`) paginates catalog data and averages review scores.
2. Clicking **"Select Plan"** invokes a sleek, dynamic modal popup. 
3. Based on the selected `plan.type`, the frontend dynamically injects distinct sub-forms:
   - *Health:* Asks for Blood Group / Pre-existing conditions.
   - *Motor:* Asks for Car specs & Registration numbers.
   - *Life:* Asks for Nominee details. Crucially maps `nominee_user_id` to link another user to this contract.
4. **Validation Logic**: 
   - A user cannot buy the exact same Life/Health plan twice.
   - A user *can* buy the same Motor plan twice (for multiple cars), but the backend throws a `409 Conflict` warning if the user attempts to enter a `vehicle_number` they've already registered.

### 3.3 Dashboard Hub & Real-time Policy Lifecycle 
- Users operate within `dashboard.html` & `my-policies.html`.
- Upon booting *My Policies*, `server.js` triggers two crucial database cleanup checks:
   - `UPDATE policies SET status='expired' WHERE end_date < TODAY`.
   - `UPDATE policies SET status='renew_soon' WHERE [difference of days] <= renew_warning_days`.
- **Nominee View:** The dashboard securely checks `policy_details` for the logged-in user's account ID inside `nominee_user_id`. If discovered, read-only "Life Policy" cards render globally informing the user they are a beneficiary.

### 3.4 Community Feedback & Review Loop
- A user can hit the "Star" action on their *owned* policy to deploy an interactive 5-star Modal overlay.
- Hitting Submit makes a `POST /api/feedback` request to the backend. The API executes an `UPSERT`—detecting if they've left a review before. If true, it gracefully overwrites it, preventing spam.
- In `policies.html` (the global catalog), any user clicking "View Reviews" opens a modal populated by a `GET` request of the unified feedbacks for that exact plan, generating community trust organically.

---

## 4. Troubleshooting & Developer Operations

### Booting the Stack
1. Ensure MySQL is running on your machine with `user=root` and `password=add your password`.
2. Start the express server:
   ```bash
   cd backend
   npm run dev
   ```
3. Boot `index.html` in your browser.

### Encountering Errors
- **`EADDRINUSE`**: If Node.js crashes aggressively on boot, another server instance is trapping port `3000`. Kill it silently using: `fuser -k 3000/tcp`.
- **MySQL Auth Fails**: Verify `backend/db.js`. Ensure the database schema explicitly matches `dbms_project`. If out of sync, drop `dbms_project` and re-inject `database.sql` followed immediately by `dummy_data.sql`.

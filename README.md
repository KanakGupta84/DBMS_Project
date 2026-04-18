# 🛡️ InsureWise — Insurance Policy Management System

A full-stack **Insurance Policy Management System** built as a DBMS course project. InsureWise enables customers to browse, purchase, and manage insurance policies (Health, Motor, Life), file and track claims, and provide feedback — while giving admins a dedicated portal for oversight and claim resolution.

---

## ✨ Features

### 👤 Customer Portal
- **Authentication** — Secure sign-up & login with SHA-256 password hashing
- **Dashboard** — Personalized overview of active policies, pending claims, and insurance categories
- **Browse Plans** — Explore a catalog of insurance plans with search, pagination, and average ratings
- **Purchase Policies** — Buy plans with type-specific data collection (health details, vehicle info, or nominee details)
- **My Policies** — View, search, filter, and cancel purchased policies
- **File Claims** — Multi-step claim submission with bank payout details
- **Track Claims** — Monitor claim status (pending / approved / declined)
- **Feedback** — Rate and review insurance plans

### 🔑 Admin Portal
- **Claims Management** — View all filed claims across users and approve or decline them
- **Plan Management** — Add new insurance plans to the catalog

---

## 🏗️ Tech Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| **Frontend** | HTML, CSS, JavaScript, Tailwind CSS         |
| **Backend**  | Node.js, Express.js                         |
| **Database** | MySQL                                       |
| **ORM/Driver** | mysql2 (with connection pooling)          |
| **Others**   | dotenv, cors, nodemon (dev)                 |

---

## 📁 Project Structure

```
dbms_project/
├── backend/
│   ├── db.js              # MySQL connection pool setup
│   ├── server.js           # Express API server (all endpoints)
│   └── package.json        # Node.js dependencies
│
├── html/
│   ├── index.html          # Login / Sign-up page
│   ├── dashboard.html      # Customer dashboard
│   ├── policies.html       # Browse insurance plans
│   ├── my-policies.html    # User's purchased policies
│   ├── my-policy.html      # Single policy detail
│   ├── claims.html         # User's claims list
│   ├── new-claim.html      # File a new claim (Step 1)
│   ├── new-claim-step2.html# File a new claim (Step 2 - Bank details)
│   ├── auth.html           # Auth page
│   ├── profile.html        # User profile
│   ├── admin-claims.html   # Admin: manage all claims
│   └── admin-plans.html    # Admin: manage plans
│
├── css/
│   ├── global.css          # Shared styles & design tokens
│   ├── auth.css            # Authentication page styles
│   ├── index.css           # Dashboard styles
│   ├── policies.css        # Plan browsing styles
│   ├── policy-details.css  # Plan detail styles
│   ├── claims.css          # Claims page styles
│   ├── profile.css         # Profile page styles
│   └── support.css         # Support page styles
│
├── js/
│   ├── global.js           # Shared header, auth guards, utilities
│   ├── auth.js             # Login / Register logic
│   ├── index.js            # Dashboard logic
│   ├── policies.js         # Plan browsing + search + pagination
│   ├── my-policies.js      # User policies list
│   ├── my-policy.js        # Single policy detail
│   ├── claims.js           # Claims list
│   ├── new-claim.js        # Claim filing (Step 1)
│   ├── new-claim-step2.js  # Claim filing (Step 2)
│   ├── admin-claims.js     # Admin claims management
│   ├── admin-plans.js      # Admin plan management
│   └── profile.js          # Profile page logic
│
├── database.sql            # Full schema: tables, indexes, triggers
├── dummy_data.sql          # Sample seed data
├── transactions.sql        # Database transactions examples
├── update_trigger.js       # Trigger logic or utility script
├── Documentation.md        # Additional project documentation
├── .env                    # Environment variables (not committed)
└── .gitignore
```

---

## 🗄️ Database Schema

The MySQL schema (`database.sql`) defines **7 tables** with proper foreign keys, constraints, and indexes:

| Table                | Purpose                                      |
|----------------------|----------------------------------------------|
| `users`              | Customer & admin accounts                    |
| `insurance_plans`    | Catalog of available insurance plans         |
| `policies`           | User-purchased policies linked to plans      |
| `policy_details`     | Type-specific data (health/motor/life)       |
| `claims`             | Filed insurance claims                       |
| `claim_payout_details`| Bank account info for claim payouts         |
| `policy_feedback`    | User ratings and reviews for plans           |

### Database Triggers
1. **`trg_no_claim_on_expired`** — Prevents filing claims on expired policies
2. **`trg_claim_within_limit`** — Ensures claim amount does not exceed the policy's sum insured

### Performance Indexes
- Indexes on frequently filtered columns: `policies.type`, `claims.status`, `insurance_plans.type`
- Indexes on foreign key columns used in JOINs: `policies.user_id`, `claims.user_id`, `claims.policy_id`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** (comes with Node.js)

### 1. Clone the Repository
```bash
git clone https://github.com/KanakGupta84/DBMS_Project.git
cd DBMS_Project
```

### 2. Set Up the Database
```bash
# Log into MySQL
mysql -u root -p

# Run the schema and seed data
source database.sql;
source dummy_data.sql;
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=dbms_project
PORT=3000
```

### 4. Install Dependencies & Start the Server
```bash
cd backend
npm install
npm run dev    # Starts with nodemon (hot-reload)
```

### 5. Open the Application
Open `html/index.html` in your browser to access the login page, or serve the files using a local server like Live Server (VS Code extension).

---

## 🔌 API Endpoints

| Method   | Endpoint                        | Description                       |
|----------|---------------------------------|-----------------------------------|
| `GET`    | `/api/health`                   | Health check                      |
| `POST`   | `/api/auth/register`            | Register a new user               |
| `POST`   | `/api/auth/login`               | User login                        |
| `GET`    | `/api/plans`                    | List all plans (paginated + search)|
| `GET`    | `/api/admin/plans`              | List all plans (admin)            |
| `POST`   | `/api/admin/plans`              | Add a new plan (admin)            |
| `DELETE` | `/api/admin/plans/:id`          | Delete a plan (admin)             |
| `POST`   | `/api/feedback`                 | Submit plan feedback              |
| `GET`    | `/api/feedback`                 | Get feedback for a plan           |
| `GET`    | `/api/feedback/me`              | Get a specific user's feedback    |
| `POST`   | `/api/my-policies`              | Purchase a policy                 |
| `GET`    | `/api/my-policies`              | Get user's policies               |
| `GET`    | `/api/my-policies/:id`          | Get single policy details         |
| `DELETE` | `/api/my-policies/:id`          | Cancel a policy                   |
| `GET`    | `/api/policies/check-claim`     | Check claim limits                |
| `POST`   | `/api/claims`                   | Submit a new claim                |
| `GET`    | `/api/my-claims`                | Get user's claims                 |
| `GET`    | `/api/admin/claims`             | Get all claims (admin)            |
| `PUT`    | `/api/admin/claims/:id/status`  | Update claim status (admin)       |
| `GET`    | `/api/users/search`             | User search for nominees          |
| `GET`    | `/api/my-nominee-policies`      | Get policies where user is nominee|

---

## 👥 Team

**Group 41**

---

## 📄 License

This project was developed as an academic project for a Database Management Systems course.

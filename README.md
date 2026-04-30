# Garage CRM

A web-based CRM for automotive repair garages. Helps owners and mechanics manage customers, vehicles, repair jobs, time tracking, and team members.

---

## Features

- **Job Management** — Create and track repair jobs with status, assigned mechanics, and descriptions
- **Customer Management** — Customer profiles linked to their vehicles and job history
- **Vehicle Inventory** — Track vehicles with make/model/year (NHTSA API integration for VIN decoding)
- **Time Tracking** — Stopwatch timer and manual time log entries per job
- **Employee Management** — Owner can approve/suspend mechanics; role-based access control
- **Dashboard** — Overview of projects in progress, total customers, and total vehicles

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router DOM 7 |
| Build Tool | Vite |
| Styling | Tailwind CSS 4 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| External API | NHTSA vPIC (vehicle make/model/VIN lookup) |

---

## User Roles

| Role | Permissions |
|---|---|
| **Owner** | Full access — manage customers, vehicles, jobs, employees |
| **Mechanic** | View/create jobs, log time, add notes — no employee management |

Mechanics sign up and are placed in `pendingApproval` status until an owner approves them.

---

## Project Structure

```
src/
├── pages/
│   ├── Home.jsx                # Dashboard
│   ├── Login.jsx / Signup.jsx  # Auth pages
│   ├── Customer.jsx            # Customer list
│   ├── CustomerDetail.jsx      # Customer profile + vehicles + jobs
│   ├── EditCustomerPage.jsx
│   ├── Storage.jsx             # Vehicle list
│   ├── StorageDetail.jsx       # Vehicle detail + related jobs + time logs
│   ├── EditCarPage.jsx         # Edit vehicle (NHTSA make/model lookup)
│   ├── Project.jsx             # Jobs list
│   ├── ProjectDetails.jsx      # Job detail + notes + timer
│   ├── EditProjectPage.jsx
│   └── EmployeeManagement.jsx  # Owner only
│
├── components/
│   ├── NavigationBar.jsx
│   ├── ProtectedRoute.jsx
│   ├── CreateJobModal.jsx
│   └── ProjectsList.jsx
│
├── hooks/
│   ├── useProjectsForCurrentUser.js
│   ├── useCustomersForCurrentUser.js
│   └── useTimerPersistance.js
│
└── lib/
    ├── firestore-helpers.js    # All Firestore queries
    ├── utils.js                # Status options, constants
    └── notion-theme.js
```

---

## Routes

| Path | Page | Access |
|---|---|---|
| `/Login` | Login | Public |
| `/Signup` | Signup | Public |
| `/Home` | Dashboard | Protected |
| `/Customer` | Customer list | Protected |
| `/customer/:id` | Customer detail | Protected |
| `/customer/:id/edit` | Edit customer | Protected |
| `/Storage` | Vehicle list | Protected |
| `/storage/:id` | Vehicle detail | Protected |
| `/storage/:id/edit` | Edit vehicle | Protected |
| `/jobs` | Jobs list | Protected |
| `/projects/:id` | Job detail | Protected |
| `/projects/:id/edit` | Edit job | Protected |
| `/employees` | Employee management | Owner only |

---

## Data Models

**Firestore structure:** `businesses/{businessId}/...`

### Customers
```js
{ name, phone, email, address, notes, createdAt, updatedAt }
```

### Vehicles (`storage` collection)
```js
{ carLabel, type, customerId, plate, make, model, year, color, vin, mileage, notes, createdAt }
```

### Projects (Jobs)
```js
{ title, customerId, carId, assignedMechanicIds[], status, description, totalMinutes, createdAt }
```

**Job statuses:** Pending → Forward Booking → Inspection → Waiting for Parts → Work Ready → WIP → Complete

### Time Logs (`Projects/{id}/TimeLogs`)
```js
{ minutes, notes, workdate, createdByEmployeeName, createdAt }
```

### Notes (`Projects/{id}/Notes`)
```js
{ text, createdByEmployeeName, createdAt }
```

### Employees
```js
{ name, email, role: "owner"|"mechanic", status: "active"|"pendingApproval"|"suspended"|"rejected" }
```

---

## Getting Started

### Prerequisites
- Node.js 16+
- npm

### Install & Run

```bash
git clone https://github.com/NemasisRinzler/Garage-CRM-Product.git
cd Garage-CRM-Product
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

---

## Firebase Setup

Firebase credentials are configured in `src/firebase.js`. The project uses:
- **Firebase Authentication** — Email/password sign-in
- **Cloud Firestore** — NoSQL database with security rules

Firestore security rules are managed in the Firebase Console. Key rules:
- Owners can read/write everything within their business
- Mechanics can read customers/vehicles/jobs, create jobs, log time, add notes
- Employees can only read their own employee document (owners can read all)

---

## Deployment

Build for production:

```bash
npm run build
```

Deploy the `/dist` folder to any static host:
- **Vercel** — Connect GitHub repo, auto-deploys on push
- **Netlify** — Same process
- **Firebase Hosting** — `firebase deploy`

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

// VitePWA auto-registers the service worker
// No manual registration needed with registerType: 'autoUpdate'
// Register service worker for PWA
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').then((registration) => {
//       console.log('✅ Service Worker registered:', registration)

//       // Check for updates periodically
//       setInterval(() => {
//         registration.update()
//       }, 60000) // Check every minute
//     }).catch((error) => {
//       console.log('❌ Service Worker registration failed:', error)
//     })
//   })
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ErrorBoundary is outermost so its fallback renders even if the auth
        layer itself throws. AuthProvider then exposes user/role/businessId
        (from custom claims) to the whole app via useAuth(). */}
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

  // ══════════════════════════════════════════════════════════════════════════════
  //  FIRESTORE DATA STRUCTURE
  // ══════════════════════════════════════════════════════════════════════════════
  // - buissness/{businessId}/
  // ├── customers
  // ├── employees
  // ├── projects
  // └── vehicles
  //
  // ──────────────────────────────────────────────────────────────────────────────
  // — Employees/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  // {
  //   name:        string          // required
  //   buissnessId: string          // required
  //   createdAt:   string
  //   email:       string          // required
  //   phone:       string
  //   role:        string
  //   status:      string
  //   uid:         string          // required
  //   updatedAt:   Timestamp       // serverTimestamp()
  // }
  //
  // ──────────────────────────────────────────────────────────────────────────────
  // — Customers/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  // {
  //   name:      string          // required
  //   phone:     string | null
  //   email:     string | null
  //   address:   string | null
  //   notes:     string | null   // optional internal notes
  //   createdAt: Timestamp       // serverTimestamp()
  //   updatedAt: Timestamp       // serverTimestamp()
  // }
  //
  // ──────────────────────────────────────────────────────────────────────────────
  // — Vehicles/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  // {
  //   vehicleLabel:    string          // e.g. "John's 2010 Honda Accord"
  //   type:        string          // "car", "truck", "motorcycle", etc.
  //   customerId:  string | null   // ref to customers/{id}
  //   plate:       string          // required
  //   make:        string          // from NHTSA
  //   model:       string          // from NHTSA
  //   color:       string | null
  //   vin:         string | null   // 17-char VIN
  //   mileage:     INT64 | null   // odometer in km
  //   notes:       string | null
  //   year:        INT64
  //   createdAt:   Timestamp
  //   createdByEmployeeId: string
  //   createdByEmployeeName: string
  //   updatedAt:   Timestamp
  // }
  //
  // NHTSA vPIC API  — free, no key required
  // Docs: https://vpic.nhtsa.dot.gov/api/
  //
  // Endpoints used:
  //   GET /vehicles/GetAllMakes?format=json
  //   GET /vehicles/GetModelsForMake/{make}?format=json
  //   GET /vehicles/DecodeVin/{vin}?format=json
  //
  // ──────────────────────────────────────────────────────────────────────────────
  // — Projects/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  //
  //  TimeLogs: [
  //      employeeName: string
  //      Uid:   string
  //      createdAt: Timestamp
  //      minutes: integer
  //      notes: string | null
  //      workdate: Timestamp
  //    ]
  //
  //  TimeLogs: [
  //      employeeName: string
  //      createdAt:   string
  //      createdByEmployeeName:   string       // required
  //      createdByEmployeeId:     string       // required
  //      text:                    string       // required
  //    ]
  //
  //   assignedMechanicId:      string          // required
  //   assignedMechanicName:    string | null
  //   vehicleId:                   string | null
  //   vehicleLabel:                string | null
  //   createdAt:               Timestamp       // serverTimestamp()
  //   createdByEmployeeId:     string          // required
  //   createdByEmployeeName:   string          // required
  //   customerId:              string | null
  //   customerName:            string | null
  //   lastNoteAt:              Timestamp | null
  //   lastNoteText:            string | null
  //   isActive:                boolean | null
  //   status:                  string | null
  //   title:                   string
  //   totalMinutes:            integer
  //   updatedAt:               Timestamp       // serverTimestamp()
  // }
  //
  // ══════════════════════════════════════════════════════════════════════════════

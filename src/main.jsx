import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

  // ══════════════════════════════════════════════════════════════════════════════
  //  FIRESTORE DATA STRUCTURE 
  // ══════════════════════════════════════════════════════════════════════════════
  // - buissness/{businessId}/
  // ├── customers (title + "Create Customer" button)
  // ├── employees (visible when list has items)
  // ├── projects  ← reads from Firestore
  // └── storage   ← writes to Firestore, updates list on success
  //
  // ──────────────────────────────────────────────────────────────────────────────
  // — employees/{auto-id}
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
  // — customers/{auto-id}
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
  // — storage/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  // {
  //   carLabel:    string          // e.g. "John's 2010 Honda Accord"
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
  // — projects/{auto-id}
  // ──────────────────────────────────────────────────────────────────────────────
  // {
  //   assignedMechanicId:      string          // required
  //   assignedMechanicName:    string | null
  //   carId:                   string | null
  //   carLabel:                string | null
  //   createdAt:               Timestamp       // serverTimestamp()
  //   createdByEmployeeId:     string          // required
  //   createdByEmployeeName:   string          // required
  //   customerId:              string | null
  //   customerName:            string | null
  //   lastNoteAt:              Timestamp | null
  //   lastNoteText:            string | null
  //   isActive:                boolean | null
  //   priority:                string | null
  //   status:                  string | null
  //   title:                   string
  //   totalMinutes:            integer
  //   updatedAt:               Timestamp       // serverTimestamp()
  // }
  //
  // ══════════════════════════════════════════════════════════════════════════════
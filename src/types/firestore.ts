import type { Timestamp } from "firebase/firestore";

/**
 * Shared shapes for the Firestore documents under businesses/{businessId}/...
 * Mirrors the schema previously documented as a comment block in main.jsx.
 * Fields are optional/loose to match data written by older app versions.
 */

export type WithId<T> = T & { id: string };

export interface Business {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  joinCode?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface Employee {
  /** Note: Firestore field is capitalized ("Name"), unlike other collections. */
  Name?: string;
  buissnessId?: string;
  createdAt?: string | Timestamp;
  email?: string;
  phone?: string;
  role?: "owner" | "mechanic" | string;
  status?: string;
  uid?: string;
  updatedAt?: Timestamp;
}

export interface Customer {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Vehicle {
  vehicleLabel?: string;
  type?: string;
  customerId?: string | null;
  plate?: string;
  make?: string;
  model?: string;
  color?: string | null;
  vin?: string | null;
  mileage?: number | null;
  notes?: string | null;
  year?: number;
  createdAt?: Timestamp;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  updatedAt?: Timestamp;
}

export interface TimeLog {
  EmployeeName?: string;
  Uid?: string;
  createdAt?: Timestamp;
  minutes?: number;
  note?: string | null;
  workDate?: Timestamp;
}

export interface ProjectNote {
  createdAt?: string | Timestamp;
  createdByEmployeeName?: string;
  createdByUid?: string;
  text?: string;
}

export interface Project {
  assignedMechanicId?: string;
  /** Historically a single name; newer writes store an array of assigned mechanic names. */
  assignedMechanicName?: string | string[] | null;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  createdAt?: Timestamp;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  customerId?: string | null;
  customerName?: string | null;
  lastNoteAt?: Timestamp | null;
  lastNoteText?: string | null;
  isActive?: boolean | null;
  status?: string | null;
  title?: string;
  totalMinutes?: number;
  updatedAt?: Timestamp;
  timerStartedAt?: Timestamp | Date | number | null;
  timerPausedAt?: Timestamp | Date | number | null;
}

export const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";

export const VEHICLE_TYPES = [
  "Car",
  "Truck",
  "Motorcycle",
  "Van",
  "Bus",
  "RV",
  "Trailer",
  "Other",
];
export const COLORS = [
  "Black",
  "White",
  "Silver",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
  "Beige",
  "Purple",
  "Other",
];

const currentYear = new Date().getFullYear();

export const YEARS = Array.from({ length: currentYear - 1885 }, (_, i) =>
  String(currentYear - i),
);

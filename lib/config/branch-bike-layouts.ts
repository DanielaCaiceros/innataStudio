export interface BikePosition {
  x: number
  y: number
}

export interface BranchBikeLayout {
  branchId: number
  name: string
  bikeCount: number
  positions: Record<number, BikePosition>
}

// Apan studio distribution (10 bikes).
const apanLayoutPositions: Record<number, BikePosition> = {
  1: { x: 24, y: 56 },
  2: { x: 34, y: 56 },
  3: { x: 44, y: 56 },
  4: { x: 54, y: 56 },
  5: { x: 64, y: 56 },
  6: { x: 76, y: 56 },
  10: { x: 70, y: 76 },
  9: { x: 58, y: 76 },
  8: { x: 46, y: 76 },
  7: { x: 34, y: 76 },
}

// Special class distribution (24 bikes): row 1 = bikes 1-13, row 2 = bikes 14-24.
const specialClassLayoutPositions: Record<number, BikePosition> = {
  1:  { x: 10, y: 55 },
  2:  { x: 17, y: 55 },
  3:  { x: 23, y: 55 },
  4:  { x: 30, y: 55 },
  5:  { x: 37, y: 55 },
  6:  { x: 43, y: 55 },
  7:  { x: 50, y: 55 },
  8:  { x: 57, y: 55 },
  9:  { x: 63, y: 55 },
  10: { x: 70, y: 55 },
  11: { x: 77, y: 55 },
  12: { x: 83, y: 55 },
  13: { x: 90, y: 55 },
  24: { x: 15, y: 77 },
  23: { x: 22, y: 77 },
  22: { x: 29, y: 77 },
  21: { x: 36, y: 77 },
  20: { x: 43, y: 77 },
  19: { x: 50, y: 77 },
  18: { x: 57, y: 77 },
  17: { x: 64, y: 77 },
  16: { x: 71, y: 77 },
  15: { x: 78, y: 77 },
  14: { x: 85, y: 77 },
}

// Sahagun studio distribution (13 bikes).
const sahagunLayoutPositions: Record<number, BikePosition> = {
  6: { x: 70, y: 58 },
  1: { x: 20, y: 58 },
  5: { x: 60, y: 58 },
  4: { x: 50, y: 58 },
  3: { x: 40, y: 58 },
  2: { x: 30, y: 58 },
  7: { x: 80, y: 58 },
  8: { x: 25, y: 77 },
  9: { x: 35, y: 77 },
  10: { x: 45, y: 77 },
  11: { x: 55, y: 77 },
  12: { x: 65, y: 77 },
  13: { x: 75, y: 77 },
}

const defaultLayout: BranchBikeLayout = {
  branchId: 2,
  name: "APAN",
  bikeCount: 10,
  positions: apanLayoutPositions,
}

export const SPECIAL_CLASS_BIKE_LAYOUT: BranchBikeLayout = {
  branchId: 0,
  name: "SPECIAL",
  bikeCount: 24,
  positions: specialClassLayoutPositions,
}

export const BRANCH_BIKE_LAYOUTS: Record<number, BranchBikeLayout> = {
  1: {
    branchId: 1,
    name: "SAHAGUN",
    bikeCount: 13,
    positions: sahagunLayoutPositions,
  },
  2: defaultLayout,
}

export function getBranchBikeLayout(branchId?: number | null): BranchBikeLayout {
  if (!branchId) return defaultLayout
  return BRANCH_BIKE_LAYOUTS[branchId] ?? defaultLayout
}

export function getBranchBikeCapacity(branchId?: number | null): number {
  return getBranchBikeLayout(branchId).bikeCount
}

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

// Sahagun studio distribution (13 bikes).
const sahagunLayoutPositions: Record<number, BikePosition> = {
  6: { x: 70, y: 58 },
  1: { x: 20, y: 58 },
  5: { x: 60, y: 58 },
  4: { x: 50, y: 58 },
  3: { x: 40, y: 58 },
  2: { x: 30, y: 58 },
  7: { x: 80, y: 58 },
  8: { x: 75, y: 77 },
  9: { x: 65, y: 77 },
  10: { x: 55, y: 77 },
  11: { x: 45, y: 77 },
  12: { x: 35, y: 77 },
  13: { x: 25, y: 77 },
}

const defaultLayout: BranchBikeLayout = {
  branchId: 2,
  name: "APAN",
  bikeCount: 10,
  positions: apanLayoutPositions,
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

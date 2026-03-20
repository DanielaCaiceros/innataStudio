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

// Current production layout coordinates are preserved as the default layout.
const defaultLayoutPositions: Record<number, BikePosition> = {
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
  bikeCount: 13,
  positions: defaultLayoutPositions,
}

export const BRANCH_BIKE_LAYOUTS: Record<number, BranchBikeLayout> = {
  // TODO: Replace with real Sahagun coordinates once final map is confirmed.
  1: {
    branchId: 1,
    name: "SAHAGUN",
    bikeCount: 10,
    positions: defaultLayoutPositions,
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

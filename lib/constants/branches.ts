import { Branch } from '@/lib/types/branch';

// Datos mock de sucursales - Reemplazar por API cuando backend esté listo
export const MOCK_BRANCHES: Branch[] = [
  {
    id: 1,
    name: "SAHAGÚN",
    address: "Sahagún, Hidalgo, México",
    phone: "55-8765-4321",
    schedule: "Lun-Sab missing",
    imageUrl: "/innataAsset1.png",
    isActive: true,
    color: "#2845D6" // Azul principal
  },
  {
    id: 2,
    name: "APAN",
    address: "Apan, Hidalgo, México",
    phone: "55-1234-5678",
    schedule: "Lun-Sab missing",
    imageUrl: "/innataAsset2.JPG",
    isActive: true,
    color: "#2845D6" // Azul principal
  }
];

export const DEFAULT_BRANCH_ID = 2; // APAN como default

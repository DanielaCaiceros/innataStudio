"use client"

import { useBranchContext } from '@/lib/context/BranchContext';
import { Branch } from '@/lib/types/branch';

/**
 * Hook para manejar la sucursal seleccionada
 * 
 * @example
 * ```tsx
 * const { selectedBranch, changeBranch, branches } = useBranch();
 * 
 * // Cambiar sucursal
 * changeBranch(branches[1]);
 * 
 * // Usar en validaciones
 * if (selectedBranch?.id === 1) {
 *   // Lógica para sucursal Centro
 * }
 * ```
 */
export function useBranch() {
  const context = useBranchContext();

  return {
    /** Sucursal actualmente seleccionada por el usuario */
    selectedBranch: context.selectedBranch,
    
    /** Lista de todas las sucursales activas disponibles */
    branches: context.branches,
    
    /** Función para cambiar la sucursal seleccionada */
    changeBranch: context.changeBranch,
    
    /** Indica si el usuario ya ha seleccionado una sucursal anteriormente */
    hasSelectedBefore: context.hasSelectedBefore,
    
    /** Indica si está cargando la información inicial */
    isLoading: context.isLoading,
    
    /** Helper: Verifica si una sucursal específica está seleccionada */
    isBranchSelected: (branchId: number) => context.selectedBranch?.id === branchId,
    
    /** Helper: Obtiene el nombre de la sucursal seleccionada */
    selectedBranchName: context.selectedBranch?.name || 'No seleccionada',
    
    /** Helper: Obtiene el color de la sucursal seleccionada */
    selectedBranchColor: context.selectedBranch?.color || '#727D73',
  };
}

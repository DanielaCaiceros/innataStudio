"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Branch, BranchContextType } from '@/lib/types/branch';
import { MOCK_BRANCHES, DEFAULT_BRANCH_ID } from '@/lib/constants/branches';

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = 'innata_selected_branch';

export function BranchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [hasSelectedBefore, setHasSelectedBefore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sucursal guardada en localStorage al montar
  useEffect(() => {
    const loadSavedBranch = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
          const savedBranch = JSON.parse(saved) as Branch;
          // Verificar que la sucursal guardada aún existe y está activa
          const validBranch = MOCK_BRANCHES.find(
            b => b.id === savedBranch.id && b.isActive
          );
          
          if (validBranch) {
            setSelectedBranch(validBranch);
            setHasSelectedBefore(true);
          } else {
            // Si la sucursal guardada ya no es válida, usar default
            const defaultBranch = MOCK_BRANCHES.find(b => b.id === DEFAULT_BRANCH_ID);
            setSelectedBranch(defaultBranch || MOCK_BRANCHES[0]);
          }
        } else {
          // Primera visita - redirigir directo a seleccionar-sucursal
          setSelectedBranch(null);
          // Solo redirigir si no estamos ya en esa página y no es admin
          if (pathname !== '/seleccionar-sucursal' && !pathname?.startsWith('/admin')) {
            router.push('/seleccionar-sucursal');
          }
        }
      } catch (error) {
        console.error('Error loading saved branch:', error);
        // En caso de error, usar sucursal default
        const defaultBranch = MOCK_BRANCHES.find(b => b.id === DEFAULT_BRANCH_ID);
        setSelectedBranch(defaultBranch || MOCK_BRANCHES[0]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedBranch();
  }, [router, pathname]);

  const changeBranch = (branch: Branch) => {
    try {
      setSelectedBranch(branch);
      setHasSelectedBefore(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
    } catch (error) {
      console.error('Error saving branch selection:', error);
    }
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        branches: MOCK_BRANCHES.filter(b => b.isActive),
        changeBranch,
        hasSelectedBefore,
        isLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
}

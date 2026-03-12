"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Branch, BranchContextType } from '@/lib/types/branch';
import { MOCK_BRANCHES } from '@/lib/constants/branches';

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = 'innata_selected_branch';

export function BranchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [hasSelectedBefore, setHasSelectedBefore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const redirectToBranchSelection = () => {
    if (pathname !== '/seleccionar-sucursal' && !pathname?.startsWith('/admin')) {
      router.push('/seleccionar-sucursal');
    }
  };

  const getBranchVisualDefaults = (id: number) => {
    const mock = MOCK_BRANCHES.find((b) => b.id === id);
    return {
      phone: mock?.phone ?? 'Sin teléfono',
      schedule: mock?.schedule ?? 'Horario por confirmar',
      imageUrl: mock?.imageUrl,
      color: mock?.color ?? '#2845D6',
    };
  };

  // Cargar sucursal guardada en localStorage al montar
  useEffect(() => {
    const loadBranchesAndSelection = async () => {
      try {
        const response = await fetch('/api/branches');
        if (!response.ok) {
          throw new Error('No se pudieron cargar sucursales desde API');
        }

        const apiBranches = await response.json();
        const mappedBranches: Branch[] = apiBranches.map((branch: { id: number; name: string; address?: string | null }) => {
          const visual = getBranchVisualDefaults(branch.id);
          return {
            id: branch.id,
            name: branch.name,
            address: branch.address ?? 'Dirección por confirmar',
            phone: visual.phone,
            schedule: visual.schedule,
            imageUrl: visual.imageUrl,
            isActive: true,
            color: visual.color,
          };
        });

        setBranches(mappedBranches);

        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
          const savedBranch = JSON.parse(saved) as Branch;

          // Verificar que la sucursal guardada aún existe y está activa en API
          const validBranch = mappedBranches.find((b) => b.id === savedBranch.id && b.isActive);

          if (validBranch) {
            setSelectedBranch(validBranch);
            setHasSelectedBefore(true);
          } else {
            // Si la sucursal guardada ya no es válida, forzar nueva selección
            localStorage.removeItem(STORAGE_KEY);
            setSelectedBranch(null);
            setHasSelectedBefore(false);
            redirectToBranchSelection();
          }
        } else {
          // Primera visita - redirigir directo a seleccionar-sucursal
          setSelectedBranch(null);
          redirectToBranchSelection();
        }
      } catch (error) {
        console.error('Error loading saved branch:', error);

        // Fallback a mock para no bloquear UX si API falla
        const fallbackBranches = MOCK_BRANCHES.filter((b) => b.isActive);
        setBranches(fallbackBranches);

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const savedBranch = JSON.parse(saved) as Branch;
            const validFallback = fallbackBranches.find((b) => b.id === savedBranch.id);
            if (validFallback) {
              setSelectedBranch(validFallback);
              setHasSelectedBefore(true);
            } else {
              localStorage.removeItem(STORAGE_KEY);
              setSelectedBranch(null);
              setHasSelectedBefore(false);
              redirectToBranchSelection();
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            setSelectedBranch(null);
            setHasSelectedBefore(false);
            redirectToBranchSelection();
          }
        } else {
          setSelectedBranch(null);
          setHasSelectedBefore(false);
          redirectToBranchSelection();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBranchesAndSelection();
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
        branches,
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

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  schedule: string;
  imageUrl?: string;
  isActive: boolean;
  color: string; // Color para identificación visual
}

export interface BranchContextType {
  selectedBranch: Branch | null;
  branches: Branch[];
  changeBranch: (branch: Branch) => void;
  hasSelectedBefore: boolean;
  isLoading: boolean;
}

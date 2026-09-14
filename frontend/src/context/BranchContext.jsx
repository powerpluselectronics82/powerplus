import React, { createContext, useContext, useState, useEffect } from 'react';
import { branchService } from '../services/branchService';
import { useAuth } from './AuthContext';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'OWNER') {
        const res = await branchService.getAllBranches();
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
          if (!selectedBranchId && res.data.length > 0) {
            setSelectedBranchId(res.data[0]._id);
          }
        }
      } else if (user.branchId) {
        setSelectedBranchId(user.branchId);
        const res = await branchService.getBranchById(user.branchId);
        if (res.success && res.data) {
          setBranches([res.data]);
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [user]);

  const currentBranch = branches.find((b) => b._id === selectedBranchId) || branches[0] || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        setSelectedBranchId,
        currentBranch,
        fetchBranches,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => useContext(BranchContext);

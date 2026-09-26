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
      const userRole = String(user.role || '').toUpperCase().trim();
      const isOwnerRole = userRole === 'OWNER' || userRole === 'ADMIN';

      // 1. If OWNER or ADMIN, fetch full company branches list
      if (isOwnerRole) {
        const res = await branchService.getAllBranches();
        if (res?.success && Array.isArray(res.data)) {
          setBranches(res.data);
          if (!selectedBranchId && res.data.length > 0) {
            setSelectedBranchId(res.data[0]._id);
          }
          return;
        }
      }

      // 2. If Manager or Staff with assigned branch, load their specific branch
      if (user.branchId) {
        setSelectedBranchId(user.branchId);
        try {
          const fallbackRes = await branchService.getBranchById(user.branchId);
          if (fallbackRes?.success && fallbackRes.data) {
            setBranches([fallbackRes.data]);
            return;
          }
        } catch (singleErr) {
          console.warn('Failed to load assigned branch by ID:', singleErr);
        }
      }

      // 3. Fallback: attempt getAllBranches if not yet loaded
      const res = await branchService.getAllBranches();
      if (res?.success && Array.isArray(res.data)) {
        setBranches(res.data);
        if (!selectedBranchId && res.data.length > 0) {
          setSelectedBranchId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.warn('Branch loading note:', err.message || err);
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

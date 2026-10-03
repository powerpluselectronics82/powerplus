import React, { createContext, useContext, useState, useEffect } from 'react';
import { branchService } from '../services/branchService';
import { useAuth } from './AuthContext';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const rawUserBranchId = typeof user?.branchId === 'object' ? user?.branchId?._id : user?.branchId;
  const [selectedBranchId, setSelectedBranchId] = useState(rawUserBranchId || '');
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const activeBranchId = typeof user?.branchId === 'object' ? user?.branchId?._id : user?.branchId;
      const userIdent = user?.userId || user?._id || '';

      // 1. Fetch all company branches for all users (Owner, Manager, Cashier, etc.)
      const res = await branchService.getAllBranches();
      let branchList = [];
      if (res?.success && Array.isArray(res.data)) {
        branchList = res.data;
      } else if (Array.isArray(res)) {
        branchList = res;
      }

      // If branchList is empty and user has a specific branch ID, try single lookup
      if (branchList.length === 0 && activeBranchId) {
        try {
          const fallbackRes = await branchService.getBranchById(activeBranchId);
          if (fallbackRes?.success && fallbackRes.data) {
            branchList = [fallbackRes.data];
          }
        } catch (singleErr) {
          console.warn('Failed to load assigned branch by ID:', singleErr);
        }
      }

      setBranches(branchList);

      // 2. Select appropriate branch ID
      if (activeBranchId && branchList.some((b) => String(b._id) === String(activeBranchId))) {
        setSelectedBranchId(activeBranchId);
      } else if (userIdent && branchList.some((b) => String(b.managerId) === String(userIdent))) {
        const mgrBranch = branchList.find((b) => String(b.managerId) === String(userIdent));
        setSelectedBranchId(mgrBranch._id);
      } else if (branchList.length > 0) {
        setSelectedBranchId((prev) => (prev && branchList.some((b) => String(b._id) === String(prev)) ? prev : branchList[0]._id));
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

  const currentBranch =
    branches.find((b) => String(b._id) === String(selectedBranchId)) ||
    branches.find((b) => String(b._id) === String(typeof user?.branchId === 'object' ? user?.branchId?._id : user?.branchId)) ||
    (user?._id || user?.userId ? branches.find((b) => String(b.managerId) === String(user._id || user.userId)) : null) ||
    branches[0] ||
    null;

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

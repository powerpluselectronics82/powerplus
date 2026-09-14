// Role-based middleware helpers
// Usage: place `auth` before these so `req.user` is available.
// Example route: `app.post('/company', auth, isOwner, createCompany)`

const allowed = (roles) => (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (roles.includes(req.user.role)) return next();

    return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Role check failed" });
  }
};

const isOwner = allowed(["OWNER"]);
const isBranchManager = allowed(["BRANCH_MANAGER"]);
const isCashier = allowed(["CASHIER"]);
const isInventoryStaff = allowed(["INVENTORY_STAFF"]);

// Common combinations
const ownerOrBranchManager = allowed(["OWNER", "BRANCH_MANAGER"]);
const managerOrInventory = allowed(["BRANCH_MANAGER", "INVENTORY_STAFF"]);

module.exports = {
  isOwner,
  isBranchManager,
  isCashier,
  isInventoryStaff,
  ownerOrBranchManager,
  managerOrInventory,
  allowed,
};

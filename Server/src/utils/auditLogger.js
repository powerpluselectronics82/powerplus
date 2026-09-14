const AuditLog = require("../model/auditLog");

const createAuditLog = async (req, { companyId, branchId, userId, userName, action, resource, resourceId, details = {} }, options = {}) => {
  const actor = req.user || {};

  return AuditLog.create(
    [
      {
        companyId: companyId || actor.companyId,
        branchId,
        userId: userId || actor.userId,
        userName: userName || actor.name || actor.role || "User",
        action,
        resource,
        resourceId: resourceId ? resourceId.toString() : "",
        details,
        ipAddress: req.ip || "",
      },
    ],
    options
  );
};

module.exports = { createAuditLog };

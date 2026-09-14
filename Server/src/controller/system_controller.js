const mongoose = require("mongoose");
const redis = require("../config/redis");
const AuditLog = require("../model/auditLog");
const { sendResponse } = require("../utils/responseHandler");

const getDatabaseHealth = async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: "Disconnected",
      1: "Connected",
      2: "Connecting",
      3: "Disconnecting",
    };

    let redisStatus = "Disconnected";
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        redisStatus = "Connected";
      }
    } catch (e) {
      redisStatus = "Error";
    }

    return sendResponse(res, 200, "System health retrieved", {
      database: {
        status: states[dbState] || "Unknown",
        name: mongoose.connection.name,
        host: mongoose.connection.host,
      },
      redis: {
        status: redisStatus,
      },
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { action, resource, limit = 50, page = 1 } = req.query;

    const query = { companyId };
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    return sendResponse(res, 200, "Audit logs fetched successfully", logs, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

const exportAuditLogs = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const logs = await AuditLog.find({ companyId }).sort({ createdAt: -1 }).lean();
    return sendResponse(res, 200, "All audit logs exported", logs);
  } catch (error) {
    next(error);
  }
};

const clearAuditLogs = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const result = await AuditLog.deleteMany({ companyId });
    return sendResponse(res, 200, `Cleared ${result.deletedCount} audit log records`, {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDatabaseHealth,
  getAuditLogs,
  exportAuditLogs,
  clearAuditLogs,
};

const mongoose = require("mongoose");
const redis = require("../config/redis");
const Payment = require("../model/payment");
const Sale = require("../model/sale");
const { createAuditLog } = require("../utils/auditLogger");

// Invalidate sales Redis caches
const invalidateSaleCaches = async (companyId, branchId, cashierId) => {
  try {
    const keysToDelete = [
      `sales:daily:${companyId}`,
      `sales:daily:${companyId}:${branchId}`,
      `sales:recent:${companyId}`,
      `sales:recent:${companyId}:${branchId}`,
      `sales:warranties:${companyId}`,
      `sales:warranties:${companyId}:${branchId}`,
    ];
    if (cashierId) {
      keysToDelete.push(
        `sales:daily:${companyId}:${branchId}:${cashierId}`,
        `sales:recent:${companyId}:${branchId}:${cashierId}`
      );
    }
    await redis.del(...keysToDelete);
  } catch (err) {
    console.error("Failed to invalidate sale cache:", err.message);
  }
};

/**
 * Receive installment or full due payment for an existing sale
 * Route: POST /api/payments/receive
 */
const receivePayment = async (req, res) => {
  const companyId = req.user?.companyId;
  const recordedBy = req.user?._id || req.user?.userId;
  const recordedByName = req.user?.name || "Cashier";

  const {
    saleId,
    amountPaid: rawAmount,
    paymentMethod,
    transactionRef = "",
    notes = "",
  } = req.body;

  if (!saleId || !mongoose.isValidObjectId(saleId)) {
    return res.status(400).json({
      success: false,
      message: "A valid saleId is required",
    });
  }

  const amountPaid = Number(rawAmount);
  if (isNaN(amountPaid) || amountPaid <= 0) {
    return res.status(400).json({
      success: false,
      message: "Payment amount must be a positive number greater than 0",
    });
  }

  const validMethods = ["CASH", "UPI", "CARD"];
  const methodClean = validMethods.includes(paymentMethod?.toUpperCase())
    ? paymentMethod.toUpperCase()
    : "CASH";

  const session = await mongoose.startSession();

  const executePaymentLogic = async (sessionOpt) => {
    let saleQuery = Sale.findOne({ _id: saleId, companyId });
    if (sessionOpt) saleQuery = saleQuery.session(sessionOpt);
    const sale = await saleQuery;

    if (!sale) {
      throw new Error("Sale invoice not found");
    }

    // Role-based branch access check
    if (req.user?.role !== "OWNER" && String(sale.branchId) !== String(req.user?.branchId)) {
      throw new Error("Unauthorized to accept payment for another branch");
    }

    // Backward compatibility: If older sale records don't have paidAmount or dueAmount initialized
    const existingPaid = typeof sale.paidAmount === "number" ? sale.paidAmount : (sale.paymentStatus === "PAID" ? sale.grandTotal : 0);
    const existingDue = typeof sale.dueAmount === "number" ? sale.dueAmount : Math.max(0, Number((sale.grandTotal - existingPaid).toFixed(2)));

    if (existingDue <= 0) {
      throw new Error("This invoice is already fully paid. No outstanding due.");
    }

    if (Number(amountPaid.toFixed(2)) > Number(existingDue.toFixed(2))) {
      throw new Error(
        `Payment amount (₹${amountPaid.toFixed(2)}) cannot exceed remaining due amount (₹${existingDue.toFixed(2)})`
      );
    }

    const updatedPaidAmount = Number((existingPaid + amountPaid).toFixed(2));
    const updatedDueAmount = Math.max(0, Number((sale.grandTotal - updatedPaidAmount).toFixed(2)));
    const updatedStatus = updatedDueAmount <= 0 ? "PAID" : "PARTIAL";

    sale.paidAmount = updatedPaidAmount;
    sale.dueAmount = updatedDueAmount;
    sale.paymentStatus = updatedStatus;
    await sale.save(sessionOpt ? { session: sessionOpt } : {});

    const paymentDoc = await Payment.create(
      [
        {
          companyId: sale.companyId,
          branchId: sale.branchId,
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          amountPaid: Number(amountPaid.toFixed(2)),
          paymentMethod: methodClean,
          transactionRef: transactionRef.trim(),
          notes: notes.trim() || `Installment payment received`,
          paymentDate: new Date(),
          recordedBy,
          recordedByName,
        },
      ],
      sessionOpt ? { session: sessionOpt } : {}
    );

    await createAuditLog(
      req,
      {
        companyId: sale.companyId,
        branchId: sale.branchId,
        action: "PAYMENT_RECEIVED",
        resource: "Payment",
        resourceId: paymentDoc[0]._id,
        details: {
          invoiceNumber: sale.invoiceNumber,
          amountPaid,
          remainingDue: updatedDueAmount,
          newStatus: updatedStatus,
          paymentMethod: methodClean,
        },
      },
      sessionOpt ? { session: sessionOpt } : {}
    );

    return { sale, payment: paymentDoc[0] };
  };

  try {
    session.startTransaction();
    const result = await executePaymentLogic(session);
    await session.commitTransaction();

    await invalidateSaleCaches(companyId, result.sale.branchId, recordedBy);

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${amountPaid.toFixed(2)} received successfully`,
      data: result,
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) {}

    // Fallback if transactions are not supported by standalone MongoDB
    if (err.message && err.message.includes("Transaction numbers are only allowed")) {
      try {
        const result = await executePaymentLogic(null);
        await invalidateSaleCaches(companyId, result.sale.branchId, recordedBy);
        return res.status(200).json({
          success: true,
          message: `Payment of ₹${amountPaid.toFixed(2)} received successfully`,
          data: result,
        });
      } catch (fallbackErr) {
        return res.status(400).json({
          success: false,
          message: fallbackErr.message || "Failed to process payment",
        });
      }
    }

    console.error("Receive payment error:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to process payment",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get payment installment history for a specific sale invoice
 * Route: GET /api/payments/sale/:saleId
 */
const getPaymentHistoryBySale = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { saleId } = req.params;

    if (!saleId || !mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Valid saleId is required",
      });
    }

    const payments = await Payment.find({
      companyId,
      saleId,
    })
      .sort({ paymentDate: -1 })
      .lean();

    const sale = await Sale.findOne({ _id: saleId, companyId })
      .select("invoiceNumber grandTotal paidAmount dueAmount paymentStatus customerName customerPhone createdAt")
      .lean();

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: {
        sale,
        payments,
      },
    });
  } catch (err) {
    console.error("Get payment history error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching payment history",
    });
  }
};

/**
 * Get all sales with outstanding dues (Due Payments dashboard)
 * Route: GET /api/payments/due-sales
 */
const getDueSales = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const {
      branchId,
      search = "",
      status, // 'PARTIAL', 'UNPAID', or empty for all with dues
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      companyId,
      dueAmount: { $gt: 0 },
    };

    // Branch filter
    if (req.user?.role !== "OWNER") {
      filter.branchId = req.user?.branchId;
    } else if (branchId && mongoose.isValidObjectId(branchId)) {
      filter.branchId = branchId;
    }

    // Status filter
    if (status && ["PARTIAL", "UNPAID"].includes(status.toUpperCase())) {
      filter.paymentStatus = status.toUpperCase();
    } else {
      filter.paymentStatus = { $in: ["PARTIAL", "UNPAID", "DUE"] };
    }

    // Search by customer name, phone, or invoice number
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
      ];
    }

    // Aggregate total due amount across matching filter
    const totalDueAgg = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDue: { $sum: "$dueAmount" },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const totalDueAmount = totalDueAgg[0]?.totalDue || 0;
    const totalCount = totalDueAgg[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    const sales = await Sale.find(filter)
      .populate("branchId", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      data: sales,
      meta: {
        totalDueAmount: Number(totalDueAmount.toFixed(2)),
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("Get due sales error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching due sales",
    });
  }
};

module.exports = {
  receivePayment,
  getPaymentHistoryBySale,
  getDueSales,
};

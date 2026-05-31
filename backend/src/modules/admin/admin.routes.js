const express = require("express");
const { requireRole } = require("../../middlewares/auth");
const { broadcast } = require("../../lib/broadcast");
const {
  getAdminStats,
  getReportByReferenceCode,
  listReports,
  rejectReport,
  reportsToCsv,
  updateReportStatus,
} = require("../reports/reports.service");

const router = express.Router();

router.use(requireRole("admin"));

router.get("/reports", async (req, res, next) => {
  try {
    const reports = await listReports({
      viewer: req.user,
      includeRejected: true,
      category: req.query.category,
      status: req.query.status,
      district: req.query.district,
      search: req.query.search,
      dateRange: req.query.dateRange,
      sort: req.query.sort,
    });

    res.json({
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/reports/export", async (req, res, next) => {
  try {
    const reports = await listReports({
      viewer: req.user,
      includeRejected: true,
      category: req.query.category,
      status: req.query.status,
      district: req.query.district,
      search: req.query.search,
      dateRange: req.query.dateRange,
      sort: req.query.sort,
    });

    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader(
      "content-disposition",
      `attachment; filename="communitymap-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(reportsToCsv(reports));
  } catch (error) {
    next(error);
  }
});

router.get("/reports/:id", async (req, res, next) => {
  try {
    const report = await getReportByReferenceCode(req.params.id, req.user);
    if (!report) {
      res.status(404).json({
        error: {
          status: 404,
          code: "REPORT_NOT_FOUND",
          message: "Laporan tidak ditemukan.",
          details: null,
          requestId: req.requestId || null,
        },
      });
      return;
    }

    res.json({ data: report });
  } catch (error) {
    next(error);
  }
});

router.patch("/reports/:id/verify", async (req, res, next) => {
  try {
    const report = await updateReportStatus(
      req.params.id,
      "verified",
      req.user.id,
      {
        note: req.body?.note || "Lokasi dan laporan diverifikasi oleh petugas.",
      },
    );

    broadcast("reports", "status-changed", {
      reportId: report.id,
      newStatus: report.status,
      updatedAt: report.updatedAt,
    });

    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/reports/:id/status", async (req, res, next) => {
  try {
    const report = await updateReportStatus(
      req.params.id,
      req.body?.nextStatus,
      req.user.id,
      {
        note: req.body?.note,
        resolutionImages: req.body?.resolutionImages,
      },
    );

    broadcast("reports", "status-changed", {
      reportId: report.id,
      newStatus: report.status,
      updatedAt: report.updatedAt,
    });

    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/reports/:id/reject", async (req, res, next) => {
  try {
    const report = await rejectReport(
      req.params.id,
      req.body?.reason,
      req.user.id,
    );

    broadcast("reports", "status-changed", {
      reportId: report.id,
      newStatus: report.status,
      updatedAt: report.updatedAt,
    });

    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const stats = await getAdminStats();
    res.json({
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminRouter: router };

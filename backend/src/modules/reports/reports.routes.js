const express = require("express");
const { requireAuth } = require("../../middlewares/auth");
const { broadcast } = require("../../lib/broadcast");
const { HttpError } = require("../../lib/http");
const {
  addComment,
  addDownvote,
  addUpvote,
  createReport,
  getReportByReferenceCode,
  listReports,
  removeDownvote,
  removeUpvote,
} = require("./reports.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const reports = await listReports({
      viewer: req.user || null,
      category: req.query.category,
      status: req.query.status,
      district: req.query.district,
      search: req.query.search,
      dateRange: req.query.dateRange,
      sort: req.query.sort,
      reporterId: req.query.reporterId,
    });

    res.json({
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const reports = await listReports({
      viewer: req.user,
      reporterId: req.user.id,
      sort: "latest",
    });

    res.json({
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await getReportByReferenceCode(req.params.id, req.user || null);

    if (!report) {
      throw new HttpError(404, "Laporan tidak ditemukan.", null, "REPORT_NOT_FOUND");
    }

    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const report = await createReport(req.body || {}, req.user.id);

    broadcast("reports", "new-report", { report });

    res.status(201).json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/upvote", requireAuth, async (req, res, next) => {
  try {
    const report = await addUpvote(req.params.id, req.user.id);
    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/upvote", requireAuth, async (req, res, next) => {
  try {
    const report = await removeUpvote(req.params.id, req.user.id);
    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/downvote", requireAuth, async (req, res, next) => {
  try {
    const report = await addDownvote(req.params.id, req.user.id);
    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/downvote", requireAuth, async (req, res, next) => {
  try {
    const report = await removeDownvote(req.params.id, req.user.id);
    res.json({
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/comments", async (req, res, next) => {
  try {
    const report = await getReportByReferenceCode(req.params.id, req.user || null);

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

    res.json({
      data: report.comments,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const { body, parentId } = req.body || {};
    const comment = await addComment(req.params.id, req.user, body, parentId);

    broadcast("reports", "new-comment", {
      reportId: req.params.id,
      comment,
    });

    res.status(201).json({
      data: comment,
    });
  } catch (error) {
    next(error);
  }
});
router.get("/debug/comments", async (req, res, next) => {
  const { query } = require("../../lib/db");
  const result = await query("SELECT * FROM report_comments");
  res.json(result.rows);
});

module.exports = { reportsRouter: router };

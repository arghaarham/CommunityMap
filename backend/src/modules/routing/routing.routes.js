const express = require("express");
const { query } = require("../../lib/db");
const { aStarRoute } = require("./routing.service");

const router = express.Router();

/**
 * GET /api/routing/route
 *
 * Menghitung rute optimal A* dari posisi petugas ke laporan-laporan yang dipilih.
 *
 * Query params:
 *   - startLat (number): Lintang posisi awal petugas
 *   - startLng (number): Bujur posisi awal petugas
 *   - reportIds (string, comma-separated): ID laporan yang akan dikunjungi
 *
 * Response:
 *   - path: Urutan kunjungan optimal
 *   - totalDistance: Total jarak tempuh (km)
 *   - iterations: Tabel iterasi A* (untuk visualisasi pedagogis)
 *   - algorithmInfo: Penjelasan algoritma
 */
router.get("/route", async (req, res, next) => {
  try {
    const { startLat, startLng, reportIds } = req.query;

    const parsedStartLat = parseFloat(startLat);
    const parsedStartLng = parseFloat(startLng);

    if (isNaN(parsedStartLat) || isNaN(parsedStartLng)) {
      return res.status(400).json({
        error: {
          message: "Parameter startLat dan startLng harus berupa angka valid.",
          code: "INVALID_START_COORDS",
        },
      });
    }

    if (!reportIds) {
      return res.status(400).json({
        error: {
          message: "Parameter reportIds diperlukan.",
          code: "MISSING_REPORT_IDS",
        },
      });
    }

    const ids = String(reportIds)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({
        error: {
          message: "Minimal satu laporan harus dipilih.",
          code: "NO_REPORTS",
        },
      });
    }

    if (ids.length > 12) {
      return res.status(400).json({
        error: {
          message: "Maksimal 12 laporan dapat diproses sekaligus untuk algoritma A* optimal.",
          code: "TOO_MANY_REPORTS",
        },
      });
    }

    // Ambil data koordinat laporan dari database
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query(
      `SELECT
         r.reference_code AS id,
         r.title,
         r.latitude,
         r.longitude,
         r.status,
         rc.slug AS category_slug
       FROM reports r
       JOIN report_categories rc ON rc.id = r.category_id
       WHERE r.reference_code IN (${placeholders})
         AND r.status != 'rejected'`,
      ids
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: "Tidak ada laporan valid yang ditemukan.",
          code: "REPORTS_NOT_FOUND",
        },
      });
    }

    const reports = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude),
      status: row.status,
      categorySlug: row.category_slug,
    }));

    const start = { lat: parsedStartLat, lng: parsedStartLng };
    const routeResult = aStarRoute(start, reports);

    res.json({
      data: routeResult,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/routing/reports
 *
 * Mengambil semua laporan aktif (non-rejected) untuk ditampilkan di peta perencana rute.
 */
router.get("/reports", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         r.reference_code AS id,
         r.title,
         r.latitude,
         r.longitude,
         r.status,
         rc.slug AS category_slug,
         r.address,
         r.district,
         r.created_at
       FROM reports r
       JOIN report_categories rc ON rc.id = r.category_id
       WHERE r.status != 'rejected'
       ORDER BY r.created_at DESC
       LIMIT 200`
    );

    const reports = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude),
      status: row.status,
      categorySlug: row.category_slug,
      address: row.address || "",
      district: row.district || "",
      createdAt: row.created_at,
    }));

    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
});

module.exports = { routingRouter: router };

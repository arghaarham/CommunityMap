const express = require("express");
const { query } = require("../../lib/db");
const { assert } = require("../../lib/http");

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const q = req.query.q || "";
    if (!q) {
      return res.json({ data: { users: [] } });
    }
    const result = await query(
      `
        SELECT username, full_name
        FROM users
        WHERE username ILIKE $1 OR full_name ILIKE $1
        LIMIT 5
      `,
      [`%${q}%`]
    );
    res.json({
      data: {
        users: result.rows.map((r) => ({ username: r.username, name: r.full_name })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const result = await query(
      `
        SELECT id, username, full_name, role, avatar_url, created_at
        FROM users
        WHERE lower(username) = lower($1)
      `,
      [username]
    );

    assert(result.rowCount > 0, 404, "User tidak ditemukan.");

    res.json({
      data: {
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username,
          fullName: result.rows[0].full_name,
          role: result.rows[0].role,
          avatarUrl: result.rows[0].avatar_url,
          createdAt: result.rows[0].created_at,
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { usersRouter: router };

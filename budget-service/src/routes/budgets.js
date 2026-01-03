const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Upravljanje proračunov
 */

/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: Pridobi vse proračune prijavljenega uporabnika
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seznam proračunov
 *       401:
 *         description: Manjka ali neveljaven JWT
 */
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    "SELECT * FROM budgets WHERE userId=$1 ORDER BY id",
    [userId]
  );

  res.json(result.rows);
});

/**
 * @swagger
 * /budgets/{id}:
 *   get:
 *     summary: Pridobi proračun po ID
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM budgets WHERE id=$1 AND userId=$2",
    [req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Budget ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Ustvari nov proračun
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", auth, async (req, res) => {
  const { limitAmount } = req.body;
  const userId = req.user.id;

  if (limitAmount == null) {
    return res.status(400).json({ error: "limitAmount je obvezen" });
  }

  const result = await pool.query(
    "INSERT INTO budgets (userId, limitAmount, spent) VALUES ($1, $2, 0) RETURNING *",
    [userId, limitAmount]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @swagger
 * /budgets/update-spend:
 *   post:
 *     summary: Posodobi porabo vseh proračunov uporabnika
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.post("/update-spend", auth, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  if (amount == null) {
    return res.status(400).json({ error: "amount je obvezen" });
  }

  const result = await pool.query(
    "UPDATE budgets SET spent = spent + $1 WHERE userId=$2 RETURNING *",
    [amount, userId]
  );

  res.json(result.rows);
});

/**
 * @swagger
 * /budgets/{id}:
 *   put:
 *     summary: Posodobi celoten proračun
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", auth, async (req, res) => {
  const { limitAmount, spent } = req.body;

  const result = await pool.query(
    "UPDATE budgets SET limitAmount=$1, spent=$2 WHERE id=$3 AND userId=$4 RETURNING *",
    [limitAmount, spent, req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Budget ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /budgets/{id}/limit:
 *   put:
 *     summary: Posodobi samo limit proračuna
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id/limit", auth, async (req, res) => {
  const { limitAmount } = req.body;

  if (limitAmount == null) {
    return res.status(400).json({ error: "limitAmount je obvezen" });
  }

  const result = await pool.query(
    "UPDATE budgets SET limitAmount=$1 WHERE id=$2 AND userId=$3 RETURNING *",
    [limitAmount, req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Budget ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /budgets/{id}:
 *   delete:
 *     summary: Izbriši proračun
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM budgets WHERE id=$1 AND userId=$2",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Budget izbrisan" });
});

/**
 * @swagger
 * /budgets/user/me:
 *   delete:
 *     summary: Izbriši vse proračune prijavljenega uporabnika
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/user/me", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM budgets WHERE userId=$1",
    [req.user.id]
  );

  res.json({ message: "Vsi budgeti izbrisani" });
});

module.exports = router;

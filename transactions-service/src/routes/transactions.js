const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Upravljanje transakcij
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Pridobi vse transakcije prijavljenega uporabnika
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seznam transakcij
 *       401:
 *         description: Manjka ali neveljaven JWT
 */
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    "SELECT * FROM transactions WHERE userId=$1 ORDER BY createdAt DESC",
    [userId]
  );

  res.json(result.rows);
});

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Pridobi transakcijo po ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM transactions WHERE id=$1 AND userId=$2",
    [req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Transakcija ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Ustvari novo transakcijo
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", auth, async (req, res) => {
  const { amount, category, note } = req.body;
  const userId = req.user.id;

  if (amount == null || !category) {
    return res.status(400).json({
      error: "amount in category sta obvezna",
    });
  }

  const result = await pool.query(
    "INSERT INTO transactions (userId, amount, category, note) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, amount, category, note || null]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @swagger
 * /transactions/import:
 *   post:
 *     summary: Masovni uvoz transakcij
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.post("/import", auth, async (req, res) => {
  const { transactions } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: "transactions mora biti seznam" });
  }

  const inserted = [];

  for (const t of transactions) {
    const result = await pool.query(
      "INSERT INTO transactions (userId, amount, category, note) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, t.amount, t.category, t.note || null]
    );
    inserted.push(result.rows[0]);
  }

  res.status(201).json(inserted);
});

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Posodobi celotno transakcijo
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", auth, async (req, res) => {
  const { amount, category, note } = req.body;

  const result = await pool.query(
    "UPDATE transactions SET amount=$1, category=$2, note=$3 WHERE id=$4 AND userId=$5 RETURNING *",
    [amount, category, note || null, req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Transakcija ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /transactions/{id}/category:
 *   put:
 *     summary: Posodobi kategorijo transakcije
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id/category", auth, async (req, res) => {
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ error: "category je obvezna" });
  }

  const result = await pool.query(
    "UPDATE transactions SET category=$1 WHERE id=$2 AND userId=$3 RETURNING *",
    [category, req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Transakcija ne obstaja" });
  }

  res.json(result.rows[0]);
});

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Izbriši transakcijo
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM transactions WHERE id=$1 AND userId=$2",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Transakcija izbrisana" });
});

/**
 * @swagger
 * /transactions/user/me:
 *   delete:
 *     summary: Izbriši vse transakcije prijavljenega uporabnika
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/user/me", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM transactions WHERE userId=$1",
    [req.user.id]
  );

  res.json({
    message: "Vse transakcije izbrisane",
  });
});

module.exports = router;

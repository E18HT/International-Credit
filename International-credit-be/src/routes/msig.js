const express = require('express');
const Joi = require('joi');
const { authenticate, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /admin/msig/actions:
 *   post:
 *     tags: [System]
 *     summary: Create multi-sig action
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, payload]
 *             properties:
 *               type:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       201:
 *         description: Action created
 */
router.post('/actions',
  authenticate,
  adminOnly,
  validate(Joi.object({ type: Joi.string().required(), payload: Joi.object().required() })),
  asyncHandler(async (req, res) => {
    // Placeholder: store in msig_actions when model/service exists
    res.status(201).json({ status: 'success', message: 'Action queued (stub)', data: { id: 'stub' } });
  })
);

/**
 * @swagger
 * /admin/msig/actions:
 *   get:
 *     tags: [System]
 *     summary: List multi-sig actions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actions listed
 */
router.get('/actions',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ status: 'success', data: { actions: [] } });
  })
);

/**
 * @swagger
 * /admin/msig/actions/{id}/approve:
 *   post:
 *     tags: [System]
 *     summary: Approve multi-sig action
 *     security:
 *       - bearerAuth: []
 */
router.post('/actions/:id/approve', authenticate, adminOnly, asyncHandler(async (req, res) => {
  res.json({ status: 'success', message: 'Approved (stub)' });
}));

/**
 * @swagger
 * /admin/msig/actions/{id}/reject:
 *   post:
 *     tags: [System]
 *     summary: Reject multi-sig action
 *     security:
 *       - bearerAuth: []
 */
router.post('/actions/:id/reject', authenticate, adminOnly, asyncHandler(async (req, res) => {
  res.json({ status: 'success', message: 'Rejected (stub)' });
}));

module.exports = router;



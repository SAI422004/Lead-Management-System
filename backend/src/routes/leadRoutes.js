const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const VALID_SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'other'];

// All lead routes require authentication
router.use(authenticate);

// GET /leads - list with pagination/search/filter/sort
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(VALID_STATUSES),
  query('source').optional().isIn(VALID_SOURCES),
  validate,
], leadController.list);

// GET /leads/:id
router.get('/:id', leadController.getOne);

// POST /leads - only admin/manager can create
router.post('/', authorize('admin', 'manager'), [
  body('name').trim().notEmpty().withMessage('Lead name is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('source').optional().isIn(VALID_SOURCES),
  body('status').optional().isIn(VALID_STATUSES),
  validate,
], leadController.create);

// PUT /leads/:id
router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(VALID_STATUSES),
  body('source').optional().isIn(VALID_SOURCES),
  validate,
], leadController.update);

// DELETE /leads/:id - only admin/manager
router.delete('/:id', authorize('admin', 'manager'), leadController.remove);

module.exports = router;

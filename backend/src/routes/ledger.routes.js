/**
 * Ledger API Routes
 */

const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');
const { validate, ledgerSchemas } = require('../middlewares/validate');
const { uploadAudio } = require('../middlewares/upload');

// POST /api/ledger/:vendorId/audio — Upload audio for processing
router.post('/:vendorId/audio', uploadAudio.single('audio'), ledgerController.processAudio);

// GET /api/ledger/:vendorId — Get ledger entries (paginated)
router.get('/:vendorId', validate(ledgerSchemas.query, 'query'), ledgerController.getEntries);

// GET /api/ledger/:vendorId/summary — Get summary stats
router.get('/:vendorId/summary', ledgerController.getSummary);

// PUT /api/ledger/entry/:entryId/confirm — Confirm daily entry
router.put('/entry/:entryId/confirm', validate(ledgerSchemas.confirm), ledgerController.confirmEntry);

// GET /api/ledger/:vendorId/today — Get today's entry
router.get('/:vendorId/today', ledgerController.getTodayEntry);

module.exports = router;

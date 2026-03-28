/**
 * Ledger API Routes — Enhanced
 *
 * New endpoints:
 *  - GET  /:vendorId/pending-clarifications — Phase 4 Feature 6
 *  - PUT  /entry/:entryId/clarify           — Phase 4 Feature 6
 */

const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');
const { validate, ledgerSchemas } = require('../middlewares/validate');
const { uploadAudio } = require('../middlewares/upload');

// POST /api/ledger/:vendorId/audio — Upload audio for processing
router.post('/:vendorId/audio', uploadAudio.single('audio'), ledgerController.processAudio);

// POST /api/ledger/:vendorId/text — Process pre-transcribed text
router.post('/:vendorId/text', ledgerController.processText);

// GET /api/ledger/:vendorId — Get ledger entries (paginated)
router.get('/:vendorId', validate(ledgerSchemas.query, 'query'), ledgerController.getEntries);

// GET /api/ledger/:vendorId/summary — Get summary stats
router.get('/:vendorId/summary', ledgerController.getSummary);

// GET /api/ledger/:vendorId/today — Get today's entry
router.get('/:vendorId/today', ledgerController.getTodayEntry);

// GET /api/ledger/:vendorId/pending-clarifications — Phase 4: Items needing clarification
router.get('/:vendorId/pending-clarifications', ledgerController.getPendingClarifications);

// PUT /api/ledger/entry/:entryId/confirm — Confirm daily entry
router.put('/entry/:entryId/confirm', validate(ledgerSchemas.confirm), ledgerController.confirmEntry);

// PUT /api/ledger/entry/:entryId/clarify — Phase 4: Resolve a clarification
router.put('/entry/:entryId/clarify', ledgerController.resolveClarification);

module.exports = router;

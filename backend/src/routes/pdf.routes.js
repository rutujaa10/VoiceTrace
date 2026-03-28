/**
 * PDF Export Routes
 */

const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdf.controller');

// GET /api/pdf/:vendorId/earnings — Generate earnings PDF
router.get('/:vendorId/earnings', pdfController.generateEarningsPDF);

module.exports = router;

/**
 * PDF Controller — Earnings Statement Generator
 */

const { asyncHandler } = require('../middlewares/errorHandler');
const pdfService = require('../services/pdf.service');
const User = require('../models/User');

/**
 * GET /api/pdf/:vendorId/earnings?days=30
 */
const generateEarningsPDF = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const days = parseInt(req.query.days, 10) || 30;
  const pdfBuffer = await pdfService.generateEarningsStatement(vendor, days);

  const filename = `VoiceTrace_Earnings_${vendor.displayName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

module.exports = { generateEarningsPDF };

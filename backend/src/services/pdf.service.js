/**
 * PDF Service — Earnings Statement Generator
 *
 * Generates a 1-page PDF income statement using PDFKit.
 */

const PDFDocument = require('pdfkit');
const LedgerEntry = require('../models/LedgerEntry');

/**
 * Generate a PDF earnings statement.
 * @param {Object} vendor — Mongoose User document
 * @param {number} days — Period in days
 * @returns {Buffer} — PDF buffer
 */
const generateEarningsStatement = async (vendor, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Fetch entries for the period
  const entries = await LedgerEntry.find({
    vendor: vendor._id,
    date: { $gte: since },
  }).sort({ date: 1 }).lean();

  const summary = await LedgerEntry.getVendorSummary(vendor._id, days);

  // Build PDF
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `VoiceTrace Earnings - ${vendor.displayName}`,
        Author: 'VoiceTrace',
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ---- Header ----
    doc.fontSize(22).font('Helvetica-Bold')
      .text('VoiceTrace', { align: 'center' });
    doc.fontSize(10).font('Helvetica')
      .text('Income Statement / Aay Vivaran', { align: 'center' });
    doc.moveDown(0.5);

    // ---- Vendor Info ----
    doc.fontSize(10).font('Helvetica');
    const periodStart = since.toLocaleDateString('en-IN');
    const periodEnd = new Date().toLocaleDateString('en-IN');

    doc.text(`Vendor: ${vendor.displayName}`, 50);
    doc.text(`Phone: ${vendor.phone}`);
    doc.text(`Category: ${vendor.businessCategory}`);
    doc.text(`Period: ${periodStart} - ${periodEnd} (${days} days)`);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown();

    // ---- Divider ----
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // ---- Summary Box ----
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');

    const summaryRows = [
      ['Total Revenue (Bikri)', `Rs. ${(summary.totalRevenue || 0).toLocaleString('en-IN')}`],
      ['Total Expenses (Kharcha)', `Rs. ${(summary.totalExpenses || 0).toLocaleString('en-IN')}`],
      ['Net Profit (Munafa)', `Rs. ${(summary.totalProfit || 0).toLocaleString('en-IN')}`],
      ['Avg Daily Revenue', `Rs. ${Math.round(summary.avgDailyRevenue || 0).toLocaleString('en-IN')}`],
      ['Total Entries', `${summary.entryCount || 0} days`],
      ['Missed Revenue (Est.)', `Rs. ${(summary.totalMissedRevenue || 0).toLocaleString('en-IN')}`],
    ];

    summaryRows.forEach(([label, value]) => {
      doc.text(`${label}:`, 70, doc.y, { continued: true, width: 250 });
      doc.font('Helvetica-Bold').text(`  ${value}`, { align: 'right' });
      doc.font('Helvetica');
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // ---- Daily Breakdown ----
    doc.fontSize(14).font('Helvetica-Bold').text('Daily Breakdown');
    doc.moveDown(0.3);

    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    const tableY = doc.y;
    doc.text('Date', 50, tableY, { width: 80 });
    doc.text('Revenue', 140, tableY, { width: 80, align: 'right' });
    doc.text('Expenses', 230, tableY, { width: 80, align: 'right' });
    doc.text('Profit', 320, tableY, { width: 80, align: 'right' });
    doc.text('Items', 410, tableY, { width: 70, align: 'right' });
    doc.text('Status', 490, tableY, { width: 55, align: 'center' });
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(8);
    entries.forEach((entry) => {
      if (doc.y > 720) {
        doc.addPage();
        doc.y = 50;
      }

      const y = doc.y + 3;
      const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short',
      });

      doc.text(dateStr, 50, y, { width: 80 });
      doc.text(`Rs.${(entry.totalRevenue || 0).toLocaleString('en-IN')}`, 140, y, { width: 80, align: 'right' });
      doc.text(`Rs.${(entry.totalExpenses || 0).toLocaleString('en-IN')}`, 230, y, { width: 80, align: 'right' });
      doc.text(`Rs.${(entry.netProfit || 0).toLocaleString('en-IN')}`, 320, y, { width: 80, align: 'right' });
      doc.text(`${entry.items?.length || 0}`, 410, y, { width: 70, align: 'right' });
      doc.text(entry.confirmedByVendor ? 'Yes' : 'Pending', 490, y, { width: 55, align: 'center' });
      doc.moveDown(0.3);
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // ---- Loan Readiness ----
    doc.fontSize(14).font('Helvetica-Bold').text('Micro-Loan Readiness Score');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Score: ${vendor.loanReadiness?.score || 0}/100`);
    doc.text(`Status: ${vendor.loanReadiness?.isLoanReady ? 'READY for PM SVANidhi' : 'Building track record...'}`);
    doc.text(`Logging Streak: ${vendor.loanReadiness?.streak || 0} consecutive days`);

    // ---- Footer ----
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica')
      .text(
        'This document is auto-generated by VoiceTrace for informational purposes. ' +
        'It serves as a track record for micro-loan applications under PM SVANidhi scheme.',
        50, doc.y, { align: 'center', width: 495 }
      );

    doc.end();
  });
};

module.exports = { generateEarningsStatement };

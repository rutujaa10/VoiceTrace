/**
 * Vendor API Routes
 */

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { validate, vendorSchemas } = require('../middlewares/validate');

// POST /api/vendors/register — Register a new vendor
router.post('/register', validate(vendorSchemas.register), vendorController.registerVendor);

// POST /api/vendors/login — Login existing vendor by phone
router.post('/login', validate(vendorSchemas.login), vendorController.loginVendor);

// GET /api/vendors/:id — Get vendor profile
router.get('/:id', vendorController.getVendor);

// PUT /api/vendors/:id — Update vendor profile
router.put('/:id', validate(vendorSchemas.update), vendorController.updateVendor);

// GET /api/vendors/:id/loan-score — Get loan readiness score
router.get('/:id/loan-score', vendorController.getLoanScore);

// GET /api/vendors/:id/dashboard — Get full dashboard data
router.get('/:id/dashboard', vendorController.getDashboard);

module.exports = router;

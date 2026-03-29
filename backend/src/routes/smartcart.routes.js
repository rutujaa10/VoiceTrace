/**
 * Smart-Cart API Routes
 *
 * /api/smartcart/recommendations  — Location-based anchor point suggestions
 * /api/smartcart/festivals        — Upcoming festival calendar + stock tips
 * /api/smartcart/daily-brief      — Combined daily consultant brief
 */

const express = require('express');
const router = express.Router();
const smartCartController = require('../controllers/smartcart.controller');

// GET /api/smartcart/recommendations?lat=19.07&lng=72.87&category=snacks
router.get('/recommendations', smartCartController.getRecommendations);

// GET /api/smartcart/festivals?days=7&category=dairy
router.get('/festivals', smartCartController.getFestivals);

// GET /api/smartcart/daily-brief?lat=19.07&lng=72.87&category=snacks
router.get('/daily-brief', smartCartController.getDailyBrief);

module.exports = router;

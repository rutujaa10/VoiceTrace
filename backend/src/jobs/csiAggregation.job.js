/**
 * CSI (Collective Street Intelligence) Aggregation Job
 *
 * Runs daily at 10 PM IST.
 * Aggregates anonymized vendor data by area:
 * - What sold well in a 2km radius
 * - Number of vendors selling each item
 * - Average prices in the area
 * Creates area-level CSI insights.
 */

const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Insight = require('../models/Insight');

const AREA_RADIUS_METERS = 2000;

const run = async () => {
  // Get all vendors with locations who logged today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeVendors = await User.find({
    isActive: true,
    location: { $ne: null },
  }).lean();

  if (activeVendors.length === 0) {
    console.log('[CSI] No active vendors with locations.');
    return;
  }

  // Group vendors into rough area clusters (grid-based)
  const clusters = clusterVendors(activeVendors);

  console.log(`[CSI] Processing ${clusters.length} area clusters...`);

  for (const cluster of clusters) {
    try {
      const [centerLng, centerLat] = cluster.center;

      // Get today's area trends using the geospatial aggregation
      const trends = await LedgerEntry.getAreaTrends(centerLng, centerLat, AREA_RADIUS_METERS, today);

      if (trends.length === 0) continue;

      // Generate CSI insight
      const topItems = trends.slice(0, 5);
      const content = generateCSIContent(topItems, cluster.vendorCount);

      await Insight.create({
        vendor: null, // area-level, not vendor-specific
        type: 'csi',
        title: `📍 Area Intelligence — ${cluster.vendorCount} vendors nearby`,
        content,
        data: {
          areaItems: topItems,
          vendorCount: cluster.vendorCount,
          date: today,
        },
        areaGeo: {
          type: 'Point',
          coordinates: [centerLng, centerLat],
        },
        areaRadius: AREA_RADIUS_METERS,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24hr TTL
      });

      // Also create vendor-specific CSI insights for vendors in this area
      for (const vendorId of cluster.vendorIds) {
        const vendorTrends = topItems.map((t) => {
          return `• ${t.item}: ${t.vendorCount} vendors sold, avg ₹${t.avgPrice}`;
        }).join('\n');

        await Insight.create({
          vendor: vendorId,
          type: 'csi',
          title: '🗺️ Area mein aaj kya bika',
          content: `Aapke area (2km) mein aaj:\n${vendorTrends}`,
          data: { areaItems: topItems },
          areaGeo: { type: 'Point', coordinates: [centerLng, centerLat] },
          areaRadius: AREA_RADIUS_METERS,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }

    } catch (err) {
      console.error('[CSI] Cluster processing error:', err.message);
    }
  }

  console.log('[CSI] Aggregation complete.');
};

/**
 * Simple grid-based clustering (0.02° ≈ 2km).
 */
const clusterVendors = (vendors) => {
  const gridSize = 0.02; // ~2km
  const grid = {};

  vendors.forEach((v) => {
    const [lng, lat] = v.location.coordinates;
    const key = `${Math.round(lng / gridSize)}_${Math.round(lat / gridSize)}`;

    if (!grid[key]) {
      grid[key] = {
        center: [
          Math.round(lng / gridSize) * gridSize,
          Math.round(lat / gridSize) * gridSize,
        ],
        vendorIds: [],
        vendorCount: 0,
      };
    }
    grid[key].vendorIds.push(v._id);
    grid[key].vendorCount++;
  });

  // Only return clusters with 2+ vendors (CSI requires multiple data points)
  return Object.values(grid).filter((c) => c.vendorCount >= 2);
};

const generateCSIContent = (topItems, vendorCount) => {
  let content = `📊 Area Demand Summary (${vendorCount} vendors):\n\n`;
  topItems.forEach((item, i) => {
    content += `${i + 1}. ${item.item} — ${item.vendorCount} vendors, ${item.totalSold} units, avg ₹${item.avgPrice}\n`;
  });
  return content;
};

module.exports = { run };

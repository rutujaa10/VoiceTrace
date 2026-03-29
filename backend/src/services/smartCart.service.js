/**
 * Smart-Cart Location & Timing Engine
 *
 * Matches vendor GPS with high-traffic anchor points (schools, offices,
 * transit hubs) and generates natural-language recommendations for
 * where to go, when to be there, and what to stock.
 */

// Anchor Point Database — POIs with peak activity windows
const ANCHOR_TYPES = {
  school: {
    label: 'School / College',
    peaks: [
      { start: '07:00', end: '08:30', activity: 'morning_arrival', description: 'Students arriving' },
      { start: '12:00', end: '14:00', activity: 'lunch_break', description: 'Lunch break / closing time' },
      { start: '15:30', end: '16:30', activity: 'dismissal', description: 'School dismissal' },
    ],
    hotItems: {
      snacks: ['samosa', 'vada pav', 'chips', 'biscuit'],
      beverages: ['juice', 'cold drinks', 'lemonade'],
      street_food: ['chaat', 'golgappa', 'momos'],
      sweets: ['candy', 'chocolate', 'ice cream'],
      fruits: ['banana', 'apple', 'guava'],
      general: ['samosa', 'chips', 'juice'],
    },
  },
  office: {
    label: 'Corporate Hub / Office',
    peaks: [
      { start: '08:00', end: '10:00', activity: 'morning_rush', description: 'Office-goers arriving' },
      { start: '12:30', end: '14:00', activity: 'lunch_hour', description: 'Lunch hour' },
      { start: '17:00', end: '19:00', activity: 'evening_exit', description: 'Evening exit / tea time' },
    ],
    hotItems: {
      snacks: ['samosa', 'kachori', 'sandwich', 'pakora'],
      beverages: ['chai', 'coffee', 'juice'],
      street_food: ['chaat', 'dosa', 'rolls'],
      fruits: ['banana', 'apple', 'orange'],
      general: ['chai', 'samosa', 'sandwich'],
    },
  },
  transit: {
    label: 'Metro / Bus Station',
    peaks: [
      { start: '07:00', end: '10:00', activity: 'morning_commute', description: 'Morning commute rush' },
      { start: '17:00', end: '20:00', activity: 'evening_commute', description: 'Evening commute rush' },
    ],
    hotItems: {
      snacks: ['vada pav', 'samosa', 'kachori'],
      beverages: ['chai', 'water', 'juice'],
      street_food: ['pav bhaji', 'rolls', 'momos'],
      fruits: ['banana', 'guava', 'seasonal fruit'],
      general: ['chai', 'vada pav', 'water'],
    },
  },
  market: {
    label: 'Market / Bazaar',
    peaks: [
      { start: '10:00', end: '13:00', activity: 'morning_shopping', description: 'Morning shoppers' },
      { start: '17:00', end: '21:00', activity: 'evening_market', description: 'Evening market rush' },
    ],
    hotItems: {
      snacks: ['samosa', 'pakora', 'chaat'],
      beverages: ['sugarcane juice', 'nimbu pani', 'chai'],
      street_food: ['golgappa', 'tikki', 'momos'],
      sweets: ['jalebi', 'gulab jamun'],
      general: ['chai', 'samosa', 'golgappa'],
    },
  },
  temple: {
    label: 'Temple / Religious Place',
    peaks: [
      { start: '06:00', end: '09:00', activity: 'morning_darshan', description: 'Morning prayers' },
      { start: '17:00', end: '20:00', activity: 'evening_aarti', description: 'Evening aarti time' },
    ],
    hotItems: {
      flowers: ['marigold', 'rose', 'jasmine'],
      sweets: ['ladoo', 'pedha', 'prasad'],
      fruits: ['coconut', 'banana', 'apple'],
      dairy: ['milk', 'curd'],
      general: ['coconut', 'flowers', 'prasad'],
    },
  },
  hospital: {
    label: 'Hospital / Clinic',
    peaks: [
      { start: '09:00', end: '12:00', activity: 'opd_morning', description: 'OPD morning hours' },
      { start: '16:00', end: '18:00', activity: 'visiting_hours', description: 'Visiting hours' },
    ],
    hotItems: {
      fruits: ['apple', 'banana', 'pomegranate', 'orange'],
      beverages: ['juice', 'water', 'coconut water'],
      snacks: ['biscuit', 'bread'],
      general: ['juice', 'fruits', 'water'],
    },
  },
};

// Mock anchor points database (simulating POI data from maps API)
// In production, this would come from Google Maps / OpenStreetMap
const MOCK_ANCHOR_POINTS = [
  { id: 'a1', name: 'Government School', type: 'school', lat: 19.0760, lng: 72.8777, address: 'Near Andheri Station' },
  { id: 'a2', name: 'Engineering College', type: 'school', lat: 19.0800, lng: 72.8900, address: 'Vile Parle' },
  { id: 'a3', name: 'IT Park Tower', type: 'office', lat: 19.0650, lng: 72.8700, address: 'MIDC Andheri East' },
  { id: 'a4', name: 'Business Center', type: 'office', lat: 19.0700, lng: 72.8780, address: 'Chakala Junction' },
  { id: 'a5', name: 'Metro Station', type: 'transit', lat: 19.0720, lng: 72.8750, address: 'Andheri Metro' },
  { id: 'a6', name: 'Bus Depot', type: 'transit', lat: 19.0680, lng: 72.8830, address: 'Andheri Bus Station' },
  { id: 'a7', name: 'Local Market', type: 'market', lat: 19.0740, lng: 72.8760, address: 'Andheri West Market' },
  { id: 'a8', name: 'Siddhivinayak Temple', type: 'temple', lat: 19.0170, lng: 72.8300, address: 'Prabhadevi' },
  { id: 'a9', name: 'City Hospital', type: 'hospital', lat: 19.0730, lng: 72.8810, address: 'SV Road' },
];

/**
 * Calculate distance between two GPS coordinates (Haversine formula).
 * Returns distance in meters.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Find nearby anchor points within a given radius.
 *
 * @param {number} lat - Vendor latitude
 * @param {number} lng - Vendor longitude
 * @param {number} radiusMeters - Search radius (default 2000m)
 * @returns {Array} Nearby anchors sorted by distance
 */
const findNearbyAnchors = (lat, lng, radiusMeters = 2000) => {
  if (!lat || !lng) return [];

  return MOCK_ANCHOR_POINTS
    .map((anchor) => ({
      ...anchor,
      distance: Math.round(haversineDistance(lat, lng, anchor.lat, anchor.lng)),
      ...ANCHOR_TYPES[anchor.type],
    }))
    .filter((a) => a.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Get the next peak window for an anchor point.
 *
 * @param {Object} anchor - Anchor with peaks array
 * @returns {Object|null} Next peak window { start, end, activity, description, startsIn }
 */
const getNextPeak = (anchor) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const peak of anchor.peaks) {
    const [startH, startM] = peak.start.split(':').map(Number);
    const peakStartMinutes = startH * 60 + startM;

    // Peak is still upcoming or currently active
    const [endH, endM] = peak.end.split(':').map(Number);
    const peakEndMinutes = endH * 60 + endM;

    if (currentMinutes < peakEndMinutes) {
      const startsIn = Math.max(0, peakStartMinutes - currentMinutes);
      return {
        ...peak,
        startsIn,
        isActive: currentMinutes >= peakStartMinutes,
      };
    }
  }

  // All peaks passed today — return first peak for tomorrow
  if (anchor.peaks.length > 0) {
    const firstPeak = anchor.peaks[0];
    const [startH, startM] = firstPeak.start.split(':').map(Number);
    const peakStartMinutes = startH * 60 + startM;
    const minutesUntilMidnight = 24 * 60 - currentMinutes;
    return {
      ...firstPeak,
      startsIn: minutesUntilMidnight + peakStartMinutes,
      isActive: false,
      isTomorrow: true,
    };
  }

  return null;
};

/**
 * Generate Smart-Cart recommendations for a vendor.
 *
 * @param {number} lat - Vendor latitude
 * @param {number} lng - Vendor longitude
 * @param {string} vendorCategory - Business category
 * @param {number} radiusMeters - Search radius
 * @returns {Object} { nearbyAnchors, recommendations, nextDayPlan }
 */
const getSmartCartRecommendations = (lat, lng, vendorCategory = 'general', radiusMeters = 2000) => {
  const nearbyAnchors = findNearbyAnchors(lat, lng, radiusMeters);

  const recommendations = nearbyAnchors.slice(0, 5).map((anchor) => {
    const nextPeak = getNextPeak(anchor);
    const hotItems = anchor.hotItems[vendorCategory] || anchor.hotItems.general || [];

    return {
      anchorId: anchor.id,
      anchorName: anchor.name,
      anchorType: anchor.type,
      anchorLabel: anchor.label,
      distance: anchor.distance,
      address: anchor.address,
      nextPeak,
      hotItems,
      suggestion: generateLocationSuggestion(anchor, nextPeak, hotItems),
    };
  });

  // Generate a "Next Day Plan" — the best opportunity for tomorrow
  const nextDayPlan = generateNextDayPlan(nearbyAnchors, vendorCategory);

  return {
    nearbyAnchors: nearbyAnchors.length,
    recommendations,
    nextDayPlan,
  };
};

/**
 * Generate natural-language suggestion for a location.
 */
const generateLocationSuggestion = (anchor, nextPeak, hotItems) => {
  if (!nextPeak) return `${anchor.name} is ${anchor.distance}m away.`;

  const itemStr = hotItems.slice(0, 3).join(', ');
  const distStr = anchor.distance < 1000
    ? `${anchor.distance}m`
    : `${(anchor.distance / 1000).toFixed(1)}km`;

  if (nextPeak.isActive) {
    return `${anchor.name} (${distStr} away) is busy right now! ${nextPeak.description}. Best items: ${itemStr}.`;
  }

  if (nextPeak.isTomorrow) {
    const [h, m] = nextPeak.start.split(':');
    return `Tomorrow at ${h}:${m}, ${anchor.name} will have ${nextPeak.description}. Reach by ${distStr} with ${itemStr}.`;
  }

  const minsLeft = nextPeak.startsIn;
  if (minsLeft <= 30) {
    return `${anchor.name} peak starts in ${minsLeft} mins! Move ${distStr} now. Stock ${itemStr}.`;
  }

  const hours = Math.floor(minsLeft / 60);
  const mins = minsLeft % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
  return `${anchor.name} (${distStr}) — next rush in ${timeStr}. ${nextPeak.description}. Bring ${itemStr}.`;
};

/**
 * Generate a "Next Day Plan" — advance notification for tomorrow's best opportunity.
 */
const generateNextDayPlan = (anchors, vendorCategory) => {
  if (anchors.length === 0) {
    return {
      available: false,
      message: 'No nearby anchor points found. Try a different location for better foot traffic.',
    };
  }

  // Find the anchor with the earliest peak tomorrow
  const best = anchors[0]; // Closest anchor
  const type = ANCHOR_TYPES[best.type];
  const firstPeak = type?.peaks[0];
  const hotItems = type?.hotItems[vendorCategory] || type?.hotItems.general || [];

  if (!firstPeak) {
    return { available: false, message: 'Could not determine peak hours for nearby locations.' };
  }

  const [h, m] = firstPeak.start.split(':');
  const arriveBy = parseInt(h) * 60 + parseInt(m) - 15; // 15 mins before
  const arriveH = Math.floor(arriveBy / 60);
  const arriveM = arriveBy % 60;

  const distStr = best.distance < 1000
    ? `${best.distance}m`
    : `${(best.distance / 1000).toFixed(1)}km`;

  return {
    available: true,
    anchorName: best.name,
    anchorType: best.type,
    distance: distStr,
    arriveBy: `${String(arriveH).padStart(2, '0')}:${String(arriveM).padStart(2, '0')}`,
    peakTime: firstPeak.start,
    hotItems: hotItems.slice(0, 4),
    message: `${best.name} is ${distStr} away. ${firstPeak.description} starts at ${firstPeak.start}. If you reach by ${String(arriveH).padStart(2, '0')}:${String(arriveM).padStart(2, '0')}, you can capture the peak crowd. Bring extra ${hotItems.slice(0, 2).join(' and ')}.`,
  };
};

module.exports = {
  getSmartCartRecommendations,
  findNearbyAnchors,
  ANCHOR_TYPES,
};

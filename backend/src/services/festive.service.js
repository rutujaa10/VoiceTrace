/**
 * Festive Service — Comprehensive Indian Festival Calendar + Stock Suggestions
 *
 * Every festival entry has items for ALL vendor categories so that any vendor
 * (fruits, vegetables, snacks, beverages, street_food, sweets, dairy, flowers,
 * general) gets relevant, actionable stock advice.
 *
 * Includes:
 *  - Major national holidays
 *  - Religious festivals (Hindu, Muslim, Sikh, Buddhist, Christian, Jain)
 *  - Recurring fasting days (Ekadashi, Purnima, Amavasya, Shravan Somvar, etc.)
 *  - Regional festivals (Pongal, Onam, Baisakhi, Chhath, etc.)
 */

// ──────────────────────────────────────────────────────────────
// CATEGORY-SPECIFIC DEFAULT BOOSTS
// When a festival doesn't have a special demand pattern for a
// category, these "general boost" items are used so the vendor
// still gets useful advice instead of nothing.
// ──────────────────────────────────────────────────────────────
const CATEGORY_DEFAULTS = {
  fruits:      ['banana', 'apple', 'coconut', 'seasonal fruit'],
  vegetables:  ['aloo', 'pyaaz', 'tamatar', 'green chilli', 'dhaniya'],
  snacks:      ['samosa', 'pakora', 'namkeen', 'chips'],
  beverages:   ['chai', 'juice', 'cold drinks', 'water'],
  street_food: ['chaat', 'golgappa', 'vada pav', 'momos'],
  sweets:      ['ladoo', 'barfi', 'gulab jamun'],
  dairy:       ['milk', 'curd', 'paneer'],
  flowers:     ['marigold', 'rose', 'jasmine'],
  general:     ['popular items', 'best sellers'],
};

// ──────────────────────────────────────────────────────────────
// FIXED-DATE FESTIVALS (month is 0-indexed)
// Each entry has items for EVERY vendor category.
// ──────────────────────────────────────────────────────────────
const FIXED_FESTIVALS = [
  // ═════ JANUARY ═════
  {
    name: 'Makar Sankranti',
    date: { month: 0, day: 14 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['sugarcane', 'banana', 'ber', 'orange'],
      vegetables:  ['green peas', 'carrot', 'radish', 'sweet potato'],
      snacks:      ['poha', 'chivda', 'til chikki', 'gajak'],
      beverages:   ['hot milk', 'chai', 'gur ka sharbat'],
      street_food: ['til ke ladoo stall', 'chikki', 'poha'],
      sweets:      ['til ladoo', 'chikki', 'gajak', 'revdi'],
      dairy:       ['milk', 'ghee', 'curd', 'khoya'],
      flowers:     ['marigold', 'rose', 'sunflower'],
      general:     ['til', 'gur', 'chikki', 'patang supplies'],
    },
  },
  {
    name: 'Pongal',
    date: { month: 0, day: 15 },
    type: 'regional',
    impact: 'high_demand',
    items: {
      fruits:      ['sugarcane', 'banana', 'coconut', 'mango'],
      vegetables:  ['sweet potato', 'pumpkin', 'beans', 'carrot'],
      snacks:      ['murukku', 'mixture', 'seedai'],
      beverages:   ['sugarcane juice', 'filter coffee', 'buttermilk'],
      street_food: ['dosa', 'idli', 'vada'],
      sweets:      ['pongal', 'payasam', 'jaggery sweets', 'ladoo'],
      dairy:       ['milk', 'curd', 'ghee', 'butter'],
      flowers:     ['marigold', 'jasmine', 'lotus'],
      general:     ['sugarcane', 'haldi', 'puja items'],
    },
  },
  {
    name: 'Republic Day',
    date: { month: 0, day: 26 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['orange', 'banana', 'guava', 'apple'],
      vegetables:  ['aloo', 'pyaaz', 'tamatar', 'capsicum'],
      snacks:      ['samosa', 'kachori', 'bhujia', 'chips'],
      beverages:   ['chai', 'juice', 'cold drinks', 'coffee'],
      street_food: ['chaat', 'golgappa', 'tikki', 'chole bhature'],
      sweets:      ['jalebi', 'ladoo', 'barfi', 'gulab jamun'],
      dairy:       ['milk', 'paneer', 'curd'],
      flowers:     ['marigold', 'rose', 'flag-color flowers'],
      general:     ['flags', 'snacks', 'cold drinks'],
    },
  },

  // ═════ FEBRUARY ═════
  {
    name: 'Vasant Panchami',
    date: { month: 1, day: 2 },
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'apple', 'mango (aam)', 'pomegranate'],
      vegetables:  ['methi', 'palak', 'sarson', 'lauki'],
      snacks:      ['boondi', 'kesar namkeen', 'mathri'],
      beverages:   ['kesar milk', 'thandai', 'chai'],
      street_food: ['meethi poori', 'chaat', 'kachori'],
      sweets:      ['kesar peda', 'barfi', 'boondi ladoo', 'halwa'],
      dairy:       ['milk', 'khoya', 'malai', 'curd'],
      flowers:     ['marigold', 'rose', 'mustard flowers', 'jasmine'],
      general:     ['yellow items', 'kesar', 'puja samagri'],
    },
  },
  {
    name: 'Maha Shivaratri',
    date: { month: 1, day: 26 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['bel fruit', 'banana', 'apple', 'coconut', 'ber'],
      vegetables:  ['aloo', 'lauki', 'arbi (colocasia)', 'shakarkandi'],
      snacks:      ['sabudana khichdi', 'kuttu pakora', 'fruit chaat'],
      beverages:   ['thandai', 'bhaang', 'lassi', 'milk'],
      street_food: ['fasting thali', 'sabudana vada', 'fruit chaat'],
      sweets:      ['malpua', 'kheer', 'halwa', 'pedha'],
      dairy:       ['milk', 'lassi', 'bhaang lassi', 'curd', 'ghee'],
      flowers:     ['dhatura', 'bel patra', 'marigold', 'lotus'],
      general:     ['bhaang', 'milk', 'bel patra', 'puja items'],
    },
  },

  // ═════ MARCH ═════
  {
    name: 'Holi',
    date: { month: 2, day: 14 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'watermelon', 'muskmelon', 'orange'],
      vegetables:  ['aloo', 'pyaaz', 'tomato', 'green chilli'],
      snacks:      ['gujiya', 'mathri', 'namkeen', 'papad', 'chips'],
      beverages:   ['thandai', 'lassi', 'cold drinks', 'nimbu pani', 'bhaang'],
      street_food: ['chaat', 'golgappa', 'dahi vada', 'papdi chaat'],
      sweets:      ['gujiya', 'malpua', 'barfi', 'rasgulla', 'gulab jamun'],
      dairy:       ['milk', 'curd', 'paneer', 'mawa', 'cream'],
      flowers:     ['marigold', 'rose petals (for holi)', 'gulal flowers'],
      general:     ['gulal', 'pichkari', 'thandai', 'gujiya'],
    },
  },

  // ═════ APRIL ═════
  {
    name: 'Ram Navami',
    date: { month: 3, day: 6 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'apple', 'coconut', 'mango', 'pomegranate'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi', 'arbi'],
      snacks:      ['sabudana khichdi', 'kuttu puri', 'fruit chaat'],
      beverages:   ['chaas', 'lassi', 'nimbu pani', 'juice'],
      street_food: ['fasting chaat', 'fruit chaat', 'sabudana vada'],
      sweets:      ['kheer', 'halwa', 'pedha', 'ladoo'],
      dairy:       ['milk', 'paneer', 'curd', 'ghee'],
      flowers:     ['marigold', 'rose', 'tulsi', 'lotus'],
      general:     ['puja thali', 'coconut', 'fruits', 'prasad'],
    },
  },
  {
    name: 'Baisakhi',
    date: { month: 3, day: 13 },
    type: 'regional',
    impact: 'high_demand',
    items: {
      fruits:      ['mango', 'watermelon', 'litchi', 'banana'],
      vegetables:  ['aloo', 'pyaaz', 'capsicum', 'paneer-ready vegs'],
      snacks:      ['samosa', 'pakora', 'bhujia', 'golgappa'],
      beverages:   ['lassi', 'sugarcane juice', 'nimbu pani', 'chaas'],
      street_food: ['chole bhature', 'tikki', 'kulfi', 'chaat'],
      sweets:      ['jalebi', 'barfi', 'gulab jamun', 'rasgulla'],
      dairy:       ['lassi', 'milk', 'butter', 'curd', 'paneer'],
      flowers:     ['marigold', 'rose', 'sunflower'],
      general:     ['lassi', 'chole bhature', 'festive snacks'],
    },
  },
  {
    name: 'Mahavir Jayanti',
    date: { month: 3, day: 10 },
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'apple', 'grapes', 'pomegranate', 'dry fruits'],
      vegetables:  ['lauki', 'tinda', 'parwal', 'seasonal greens'],
      snacks:      ['dry fruit mix', 'makhana', 'fruit chaat'],
      beverages:   ['juice', 'nimbu pani', 'coconut water'],
      street_food: ['fruit chaat', 'dry fruit chaat'],
      sweets:      ['dry fruit ladoo', 'mishri', 'pedha'],
      dairy:       ['milk', 'ghee', 'curd'],
      flowers:     ['lotus', 'marigold', 'chameli'],
      general:     ['fruits', 'dry fruits', 'puja items'],
    },
  },

  // ═════ MAY ═════
  {
    name: 'Buddha Purnima',
    date: { month: 4, day: 12 },
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'coconut', 'apple', 'orange'],
      vegetables:  ['seasonal vegetables', 'lauki', 'palak'],
      snacks:      ['kheer ingredients', 'makhana', 'sabudana'],
      beverages:   ['juice', 'coconut water', 'chai'],
      street_food: ['fruit chaat', 'khichdi'],
      sweets:      ['kheer', 'ladoo', 'halwa'],
      dairy:       ['milk', 'ghee', 'curd'],
      flowers:     ['lotus', 'marigold', 'jasmine', 'champa'],
      general:     ['lotus', 'incense', 'puja items'],
    },
  },

  // ═════ JUNE ═════
  {
    name: 'Eid ul-Fitr',
    date: { month: 5, day: 30 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['dates', 'banana', 'grapes', 'apple', 'pomegranate'],
      vegetables:  ['pyaaz', 'tamatar', 'green chilli', 'dhaniya', 'pudina'],
      snacks:      ['kebab', 'cutlet', 'samosa', 'haleem'],
      beverages:   ['rooh afza', 'sherbet', 'lassi', 'nimbu pani'],
      street_food: ['biryani', 'kebab rolls', 'tikka', 'seekh kebab'],
      sweets:      ['sewaiyan', 'sheer khurma', 'barfi', 'gulab jamun'],
      dairy:       ['milk', 'cream', 'khoya', 'paneer', 'curd'],
      flowers:     ['rose', 'jasmine', 'ittar flowers'],
      general:     ['sewaiyan', 'dates', 'attar', 'festive wear'],
    },
  },

  // ═════ JULY ═════
  {
    name: 'Guru Purnima',
    date: { month: 6, day: 10 },
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'coconut', 'apple', 'mango'],
      vegetables:  ['seasonal greens', 'lauki', 'tinda'],
      snacks:      ['ladoo', 'namkeen', 'mithai box items'],
      beverages:   ['chai', 'lassi', 'juice'],
      street_food: ['chaat', 'poha', 'kachori'],
      sweets:      ['ladoo', 'pedha', 'barfi', 'halwa'],
      dairy:       ['milk', 'curd', 'ghee', 'paneer'],
      flowers:     ['marigold', 'rose', 'lotus', 'jasmine'],
      general:     ['puja thali', 'flowers', 'sweets'],
    },
  },

  // ═════ AUGUST ═════
  {
    name: 'Independence Day',
    date: { month: 7, day: 15 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['orange', 'watermelon', 'mango', 'guava', 'seasonal'],
      vegetables:  ['aloo', 'pyaaz', 'tamatar', 'capsicum', 'matar'],
      snacks:      ['samosa', 'kachori', 'vada pav', 'bhujia'],
      beverages:   ['juice', 'chai', 'cold drinks', 'sharbat'],
      street_food: ['chaat', 'pani puri', 'tikki', 'bhel'],
      sweets:      ['jalebi', 'barfi', 'ladoo', 'gulab jamun'],
      dairy:       ['milk', 'curd', 'paneer', 'lassi'],
      flowers:     ['marigold', 'tricolor flowers', 'rose'],
      general:     ['flags', 'badges', 'festive snacks'],
    },
  },
  {
    name: 'Raksha Bandhan',
    date: { month: 7, day: 19 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['mango', 'apple', 'dry fruits box', 'kiwi', 'pomegranate'],
      vegetables:  ['aloo', 'paneer-ready vegs', 'capsicum', 'matar'],
      snacks:      ['namkeen', 'mathri', 'mixture', 'chips'],
      beverages:   ['cold drinks', 'juice', 'sharbat', 'lassi'],
      street_food: ['chole bhature', 'chaat', 'golgappa', 'momos'],
      sweets:      ['kaju katli', 'barfi', 'rasgulla', 'soan papdi', 'gulab jamun'],
      dairy:       ['milk', 'khoya', 'rabri', 'paneer', 'curd'],
      flowers:     ['rose', 'marigold', 'orchid', 'jasmine'],
      general:     ['rakhi', 'sweets box', 'gifts', 'dry fruits'],
    },
  },
  {
    name: 'Janmashtami',
    date: { month: 7, day: 26 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'apple', 'grapes', 'pomegranate', 'coconut'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi', 'arbi'],
      snacks:      ['sabudana khichdi', 'makhana', 'fruit chaat', 'kuttu pakora'],
      beverages:   ['lassi', 'chaas', 'makhan milk', 'panchamrit'],
      street_food: ['fasting chaat', 'sabudana vada', 'fruit stall'],
      sweets:      ['peda', 'ladoo', 'kheer', 'makhan mishri', 'gopalkala'],
      dairy:       ['milk', 'butter', 'makhan', 'curd', 'ghee', 'cream'],
      flowers:     ['tulsi', 'marigold', 'lotus', 'jasmine', 'mogra'],
      general:     ['makhan', 'matki', 'jhula decorations', 'puja items'],
    },
  },

  // ═════ SEPTEMBER ═════
  {
    name: 'Ganesh Chaturthi',
    date: { month: 8, day: 7 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['coconut', 'banana', 'pomegranate', 'mango', 'guava'],
      vegetables:  ['aloo', 'shakarkandi', 'brinjal', 'drumstick'],
      snacks:      ['modak ingredients', 'poha chivda', 'chakli', 'shankarpali'],
      beverages:   ['sharbat', 'juice', 'nimbu pani', 'coconut water', 'lassi'],
      street_food: ['modak stall', 'ukadiche modak', 'puran poli'],
      sweets:      ['modak', 'ladoo', 'pedha', 'puran poli', 'barfi'],
      dairy:       ['milk', 'khoya', 'coconut milk', 'ghee', 'curd'],
      flowers:     ['marigold', 'hibiscus', 'jasmine', 'durva grass'],
      general:     ['murti', 'decoration', 'modak', 'puja samagri'],
    },
  },
  {
    name: 'Onam',
    date: { month: 8, day: 15 },
    type: 'regional',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'jackfruit', 'mango', 'pineapple', 'coconut'],
      vegetables:  ['yam', 'raw banana', 'drumstick', 'ash gourd', 'beans'],
      snacks:      ['banana chips', 'murukku', 'mixture', 'achappam'],
      beverages:   ['payasam', 'buttermilk', 'coconut water', 'sambharam'],
      street_food: ['sadya items', 'banana chips', 'unniyappam'],
      sweets:      ['payasam', 'ada pradhaman', 'unniyappam', 'ladoo'],
      dairy:       ['milk', 'curd', 'ghee', 'butter'],
      flowers:     ['marigold', 'thumba', 'chrysanthemum', 'orchid'],
      general:     ['pookalam flowers', 'banana leaf', 'onam sarees'],
    },
  },

  // ═════ OCTOBER ═════
  {
    name: 'Navratri Begins',
    date: { month: 9, day: 3 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'apple', 'coconut', 'pomegranate', 'grapes', 'chiku'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi', 'arbi', 'pumpkin'],
      snacks:      ['sabudana khichdi', 'kuttu puri', 'makhana', 'singhara atta items'],
      beverages:   ['lassi', 'chaas', 'nimbu pani', 'coconut water', 'juice'],
      street_food: ['vrat thali', 'sabudana vada', 'fruit chaat', 'kuttu pakora'],
      sweets:      ['halwa', 'kheer', 'makhana kheer', 'shakarkandi halwa'],
      dairy:       ['milk', 'curd', 'ghee', 'paneer', 'mawa'],
      flowers:     ['marigold', 'rose', 'jasmine', 'durva grass', 'lotus'],
      general:     ['vrat samagri', 'kuttu atta', 'sabudana', 'singhara atta', 'rock salt'],
    },
  },
  {
    name: 'Dussehra',
    date: { month: 9, day: 12 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'apple', 'pomegranate', 'seasonal fruits'],
      vegetables:  ['aloo', 'pyaaz', 'tamatar', 'shimla mirch'],
      snacks:      ['samosa', 'pakora', 'jalebi-fafda', 'namkeen'],
      beverages:   ['chai', 'juice', 'cold drinks', 'sharbat'],
      street_food: ['chaat', 'golgappa', 'tikki', 'chole bhature'],
      sweets:      ['jalebi', 'ladoo', 'barfi', 'imarti', 'gulab jamun'],
      dairy:       ['milk', 'rabri', 'paneer', 'curd'],
      flowers:     ['marigold', 'apta leaves', 'rose', 'shami patra'],
      general:     ['ravan effigies', 'mela snacks', 'festive items'],
    },
  },
  {
    name: 'Karwa Chauth',
    date: { month: 9, day: 20 },
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['apple', 'pomegranate', 'grapes', 'dry fruits', 'orange'],
      vegetables:  ['seasonal vegs for sargi', 'aloo', 'shakarkandi'],
      snacks:      ['mathri', 'namkeen', 'dry fruit mixtures', 'makhana'],
      beverages:   ['juice', 'nimbu pani', 'coconut water', 'lassi'],
      street_food: ['chaat', 'fruit chaat', 'papdi chaat'],
      sweets:      ['mathri', 'thekua', 'ladoo', 'barfi'],
      dairy:       ['milk', 'curd', 'rabri', 'kheer'],
      flowers:     ['marigold', 'rose', 'jasmine', 'mehndi'],
      general:     ['karwa', 'chalni', 'mehndi', 'shringar items'],
    },
  },

  // ═════ NOVEMBER ═════
  {
    name: 'Diwali',
    date: { month: 10, day: 1 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['dry fruits', 'apple', 'pomegranate', 'grapes', 'kiwi'],
      vegetables:  ['aloo', 'matar', 'paneer-ready vegs', 'fresh herbs'],
      snacks:      ['namkeen', 'mathri', 'chakli', 'mixture', 'chips', 'sev'],
      beverages:   ['cold drinks', 'juice', 'sharbat', 'chai'],
      street_food: ['chaat', 'golgappa', 'tikki', 'pav bhaji'],
      sweets:      ['kaju katli', 'gulab jamun', 'rasgulla', 'ladoo', 'barfi', 'soan papdi'],
      dairy:       ['milk', 'khoya', 'paneer', 'mawa', 'cream', 'ghee'],
      flowers:     ['marigold', 'rose', 'jasmine', 'lotus', 'genda phool'],
      general:     ['diyas', 'candles', 'rangoli', 'gift boxes', 'crackers'],
    },
  },
  {
    name: 'Bhai Dooj',
    date: { month: 10, day: 3 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['dry fruits', 'apple', 'pomegranate', 'grapes', 'kiwi'],
      vegetables:  ['aloo', 'capsicum', 'paneer-ready vegs'],
      snacks:      ['namkeen', 'mixture', 'chips'],
      beverages:   ['juice', 'cold drinks', 'chai'],
      street_food: ['chaat', 'golgappa', 'chole bhature'],
      sweets:      ['barfi', 'ladoo', 'peda', 'kaju katli'],
      dairy:       ['milk', 'curd', 'paneer'],
      flowers:     ['rose', 'marigold', 'jasmine'],
      general:     ['tikka items', 'gifts', 'sweets box'],
    },
  },
  {
    name: 'Chhath Puja',
    date: { month: 10, day: 7 },
    type: 'regional',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'sugarcane', 'coconut', 'seasonal fruits', 'lemon'],
      vegetables:  ['chane ka atta items', 'sweet potato', 'radish'],
      snacks:      ['thekua', 'rice ladoo', 'khasta'],
      beverages:   ['sugarcane juice', 'coconut water', 'milk'],
      street_food: ['thekua stall', 'prasad items'],
      sweets:      ['thekua', 'kheer', 'rice ladoo', 'gur ke ladoo'],
      dairy:       ['milk', 'ghee', 'curd'],
      flowers:     ['marigold', 'lotus', 'champa', 'sugarcane leaves'],
      general:     ['sup', 'daura', 'sugarcane', 'coconut', 'puja items'],
    },
  },
  {
    name: 'Guru Nanak Jayanti',
    date: { month: 10, day: 15 },
    type: 'religious',
    impact: 'high_demand',
    items: {
      fruits:      ['banana', 'apple', 'seasonal fruits', 'dry fruits'],
      vegetables:  ['aloo', 'pyaaz', 'gobhi', 'matar'],
      snacks:      ['samosa', 'pakora', 'chole bhature'],
      beverages:   ['lassi', 'chai', 'milk'],
      street_food: ['chole bhature', 'langar items', 'halwa puri'],
      sweets:      ['karah prasad', 'ladoo', 'barfi', 'gulab jamun'],
      dairy:       ['milk', 'lassi', 'curd', 'ghee', 'butter'],
      flowers:     ['marigold', 'rose', 'jasmine'],
      general:     ['langar supplies', 'prasad', 'flowers'],
    },
  },

  // ═════ DECEMBER ═════
  {
    name: 'Christmas',
    date: { month: 11, day: 25 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['apple', 'grapes', 'orange', 'strawberry', 'dry fruits'],
      vegetables:  ['broccoli', 'capsicum', 'mushroom', 'sweet corn'],
      snacks:      ['pastries', 'cookies', 'chips', 'wafers'],
      beverages:   ['hot chocolate', 'coffee', 'cold drinks', 'juice'],
      street_food: ['cake stall', 'pastry stall', 'momos', 'rolls'],
      sweets:      ['cake', 'cookies', 'plum cake', 'brownies', 'donuts'],
      dairy:       ['milk', 'cream', 'butter', 'cheese'],
      flowers:     ['poinsettia', 'rose', 'lily', 'carnation'],
      general:     ['cake', 'decorations', 'gift wrapping', 'candles'],
    },
  },
  {
    name: 'New Year Eve',
    date: { month: 11, day: 31 },
    type: 'national',
    impact: 'high_demand',
    items: {
      fruits:      ['grapes', 'strawberry', 'apple', 'orange', 'cherry'],
      vegetables:  ['capsicum', 'mushroom', 'corn', 'paneer-ready vegs'],
      snacks:      ['samosa', 'spring rolls', 'chips', 'namkeen'],
      beverages:   ['juice', 'cold drinks', 'chai', 'coffee', 'mocktails'],
      street_food: ['chaat', 'momos', 'rolls', 'tandoori items'],
      sweets:      ['cake', 'gulab jamun', 'pastries', 'ice cream'],
      dairy:       ['milk', 'cream', 'paneer', 'cheese'],
      flowers:     ['rose', 'lily', 'carnation', 'orchid'],
      general:     ['party items', 'decorations', 'cake', 'balloons'],
    },
  },
];

// ──────────────────────────────────────────────────────────────
// RECURRING RELIGIOUS / FASTING DAYS
// These happen multiple times a year (twice a month for Ekadashi,
// monthly for Purnima/Amavasya, weekly during Shravan, etc.)
// They are generated dynamically.
// ──────────────────────────────────────────────────────────────
const RECURRING_EVENTS = [
  {
    name: 'Ekadashi (Fasting Day)',
    // Ekadashi falls roughly on the 11th day of each lunar fortnight — approx twice a month
    // We model the well-known Ekadashi dates for 2026
    knownDates2026: [
      { month: 0, day: 6 }, { month: 0, day: 21 },   // Jan
      { month: 1, day: 5 }, { month: 1, day: 19 },   // Feb
      { month: 2, day: 6 }, { month: 2, day: 21 },   // Mar
      { month: 3, day: 5 }, { month: 3, day: 19 },   // Apr
      { month: 4, day: 4 }, { month: 4, day: 19 },   // May
      { month: 5, day: 3 }, { month: 5, day: 17 },   // Jun
      { month: 6, day: 2 }, { month: 6, day: 17 },   // Jul
      { month: 7, day: 1 }, { month: 7, day: 15 }, { month: 7, day: 31 },   // Aug
      { month: 8, day: 14 }, { month: 8, day: 29 },  // Sep
      { month: 9, day: 13 }, { month: 9, day: 28 },  // Oct
      { month: 10, day: 12 }, { month: 10, day: 27 }, // Nov
      { month: 11, day: 11 }, { month: 11, day: 26 }, // Dec
    ],
    type: 'fasting',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'apple', 'pomegranate', 'grapes', 'papaya', 'chiku'],
      vegetables:  ['aloo', 'shakarkandi', 'arbi', 'lauki', 'kachcha kela'],
      snacks:      ['sabudana khichdi', 'makhana', 'kuttu pakora', 'singhara chips'],
      beverages:   ['nimbu pani', 'coconut water', 'juice', 'lassi', 'chaas'],
      street_food: ['fruit chaat', 'sabudana vada', 'aloo chaat (vrat wala)'],
      sweets:      ['halwa', 'kheer', 'shakarkandi halwa', 'makhana kheer'],
      dairy:       ['milk', 'curd', 'ghee', 'paneer (fresh)', 'butter'],
      flowers:     ['tulsi', 'marigold', 'lotus'],
      general:     ['sabudana', 'kuttu atta', 'singhara atta', 'rock salt', 'fruits'],
    },
  },
  {
    name: 'Purnima (Full Moon)',
    // Approx one per month
    knownDates2026: [
      { month: 0, day: 13 },  // Jan
      { month: 1, day: 12 },  // Feb
      { month: 2, day: 14 },  // Mar (coincides with Holi)
      { month: 3, day: 12 },  // Apr
      { month: 4, day: 12 },  // May (Buddha Purnima)
      { month: 5, day: 11 },  // Jun
      { month: 6, day: 10 },  // Jul (Guru Purnima)
      { month: 7, day: 9 },   // Aug
      { month: 8, day: 7 },   // Sep
      { month: 9, day: 7 },   // Oct
      { month: 10, day: 5 },  // Nov
      { month: 11, day: 4 },  // Dec
    ],
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'coconut', 'apple', 'seasonal fruit'],
      vegetables:  ['lauki', 'tinda', 'seasonal vegetables'],
      snacks:      ['kheer ingredients', 'sabudana', 'poha'],
      beverages:   ['milk', 'lassi', 'juice', 'chai'],
      street_food: ['chaat', 'poha', 'fruit stall'],
      sweets:      ['kheer', 'ladoo', 'halwa', 'pedha'],
      dairy:       ['milk', 'curd', 'ghee'],
      flowers:     ['marigold', 'jasmine', 'lotus', 'rose'],
      general:     ['puja thali', 'incense', 'camphor', 'flowers'],
    },
  },
  {
    name: 'Amavasya (New Moon)',
    knownDates2026: [
      { month: 0, day: 29 },  // Jan
      { month: 1, day: 27 },  // Feb
      { month: 2, day: 29 },  // Mar
      { month: 3, day: 27 },  // Apr
      { month: 4, day: 27 },  // May
      { month: 5, day: 25 },  // Jun
      { month: 6, day: 25 },  // Jul
      { month: 7, day: 23 },  // Aug
      { month: 8, day: 21 },  // Sep
      { month: 9, day: 21 },  // Oct (Diwali Amavasya)
      { month: 10, day: 20 }, // Nov
      { month: 11, day: 20 }, // Dec
    ],
    type: 'religious',
    impact: 'specific_items',
    items: {
      fruits:      ['banana', 'coconut', 'lemon', 'seasonal fruit'],
      vegetables:  ['seasonal vegetables', 'aloo', 'lauki'],
      snacks:      ['poha', 'sabudana', 'makhana'],
      beverages:   ['til oil (for lamp)', 'milk', 'chai'],
      street_food: ['chaat', 'poha', 'snack stall'],
      sweets:      ['halwa', 'ladoo', 'kheer'],
      dairy:       ['milk', 'ghee', 'curd'],
      flowers:     ['marigold', 'jasmine', 'mogra'],
      general:     ['til oil', 'diya', 'incense', 'puja items'],
    },
  },
  {
    name: 'Somvar Vrat (Monday Fast)',
    // Every Monday during Shravan month (roughly Jul-Aug)
    // We list 4 Mondays during the Shravan period of 2026
    knownDates2026: [
      { month: 6, day: 13 },  // Jul Mon
      { month: 6, day: 20 },  // Jul Mon
      { month: 6, day: 27 },  // Jul Mon
      { month: 7, day: 3 },   // Aug Mon
    ],
    type: 'fasting',
    impact: 'high_demand',
    items: {
      fruits:      ['bel fruit', 'banana', 'apple', 'coconut'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi', 'arbi'],
      snacks:      ['sabudana khichdi', 'kuttu pakora', 'makhana'],
      beverages:   ['bhaang', 'thandai', 'lassi', 'milk', 'panchamrit'],
      street_food: ['vrat thali', 'sabudana vada', 'fruit chaat'],
      sweets:      ['kheer', 'halwa', 'pedha', 'malpua'],
      dairy:       ['milk', 'curd', 'ghee', 'butter', 'lassi'],
      flowers:     ['bel patra', 'dhatura', 'marigold', 'lotus'],
      general:     ['bel patra', 'dhatura', 'milk', 'puja items', 'jaldhara'],
    },
  },
  {
    name: 'Sankashti Chaturthi',
    // Once a month — we list 2026 dates
    knownDates2026: [
      { month: 0, day: 18 }, { month: 1, day: 16 }, { month: 2, day: 18 },
      { month: 3, day: 16 }, { month: 4, day: 16 }, { month: 5, day: 14 },
      { month: 6, day: 14 }, { month: 7, day: 12 }, { month: 8, day: 11 },
      { month: 9, day: 10 }, { month: 10, day: 9 }, { month: 11, day: 8 },
    ],
    type: 'fasting',
    impact: 'specific_items',
    items: {
      fruits:      ['coconut', 'banana', 'pomegranate', 'grapes', 'seasonal fruit'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi'],
      snacks:      ['sabudana khichdi', 'makhana', 'fruit chaat'],
      beverages:   ['milk', 'juice', 'coconut water'],
      street_food: ['modak stall', 'fruit chaat', 'sabudana vada'],
      sweets:      ['modak', 'ladoo', 'pedha', 'kheer'],
      dairy:       ['milk', 'ghee', 'curd'],
      flowers:     ['durva grass', 'marigold', 'red hibiscus'],
      general:     ['durva', 'modak', 'puja items', 'red flowers'],
    },
  },
  {
    name: 'Pradosh Vrat',
    // Roughly twice a month — major ones listed
    knownDates2026: [
      { month: 0, day: 10 }, { month: 0, day: 25 },
      { month: 1, day: 9 }, { month: 1, day: 23 },
      { month: 2, day: 10 }, { month: 2, day: 25 },
      { month: 3, day: 9 }, { month: 3, day: 23 },
      { month: 4, day: 8 }, { month: 4, day: 23 },
      { month: 5, day: 7 }, { month: 5, day: 21 },
      { month: 6, day: 6 }, { month: 6, day: 21 },
      { month: 7, day: 5 }, { month: 7, day: 19 },
      { month: 8, day: 3 }, { month: 8, day: 18 },
      { month: 9, day: 3 }, { month: 9, day: 17 },
      { month: 10, day: 1 }, { month: 10, day: 16 },
      { month: 11, day: 1 }, { month: 11, day: 15 },
    ],
    type: 'fasting',
    impact: 'specific_items',
    items: {
      fruits:      ['bel fruit', 'banana', 'apple', 'coconut'],
      vegetables:  ['aloo', 'lauki', 'shakarkandi'],
      snacks:      ['sabudana khichdi', 'kuttu items', 'makhana'],
      beverages:   ['milk', 'thandai', 'lassi'],
      street_food: ['vrat thali', 'sabudana vada'],
      sweets:      ['kheer', 'halwa', 'pedha'],
      dairy:       ['milk', 'curd', 'ghee'],
      flowers:     ['bel patra', 'dhatura', 'marigold'],
      general:     ['bel patra', 'milk', 'puja items'],
    },
  },
];

// ──────────────────────────────────────────────────────────────
// SEASONAL / WEATHER EVENTS (general advice, always applicable)
// ──────────────────────────────────────────────────────────────
const SEASONAL_TIPS = [
  {
    name: 'Summer Peak',
    monthRange: [3, 4, 5], // Apr-Jun
    items: {
      fruits:      ['watermelon', 'mango', 'muskmelon', 'litchi', 'ice apple'],
      vegetables:  ['lauki', 'tinda', 'cucumber', 'onion'],
      snacks:      ['ice gola ingredients', 'chana jor', 'makhana'],
      beverages:   ['nimbu pani', 'sugarcane juice', 'lassi', 'aam panna', 'kokum sharbat'],
      street_food: ['gola', 'kulfi', 'ice cream', 'fruit chaat'],
      sweets:      ['kulfi', 'ice cream', 'rabri', 'falooda'],
      dairy:       ['chaas', 'lassi', 'curd', 'ice cream'],
      flowers:     ['mogra', 'jasmine', 'champa'],
      general:     ['cold drinks', 'ORS packets', 'sunscreen'],
    },
  },
  {
    name: 'Monsoon Season',
    monthRange: [6, 7, 8], // Jul-Sep
    items: {
      fruits:      ['jamun', 'litchi', 'plum', 'peach', 'pear'],
      vegetables:  ['corn', 'arbi', 'green chilli', 'ginger'],
      snacks:      ['pakora', 'bhutta', 'samosa', 'kachori'],
      beverages:   ['chai', 'adrak chai', 'hot coffee', 'soup'],
      street_food: ['bhutta (corn)', 'pakora stall', 'hot samosa'],
      sweets:      ['jalebi', 'gulab jamun', 'halwa'],
      dairy:       ['milk', 'chai ingredients', 'paneer'],
      flowers:     ['lotus', 'water lily', 'jasmine'],
      general:     ['umbrellas', 'raincoats', 'hot snacks'],
    },
  },
  {
    name: 'Winter Peak',
    monthRange: [10, 11, 0, 1], // Nov-Feb
    items: {
      fruits:      ['orange', 'guava', 'strawberry', 'grapes', 'apple'],
      vegetables:  ['sarson', 'methi', 'palak', 'gajar', 'matar', 'mooli'],
      snacks:      ['gajak', 'chikki', 'moongfali', 'til items'],
      beverages:   ['adrak chai', 'hot coffee', 'hot chocolate', 'soup'],
      street_food: ['gajar halwa stall', 'makki roti-sarson', 'momos'],
      sweets:      ['gajar halwa', 'gajak', 'til ladoo', 'moong dal halwa'],
      dairy:       ['milk', 'rabri', 'malai', 'ghee'],
      flowers:     ['marigold', 'rose', 'guldaudi'],
      general:     ['heaters', 'warm snacks', 'gajar halwa'],
    },
  },
];


// ──────────────────────────────────────────────────────────────
// CORE LOGIC
// ──────────────────────────────────────────────────────────────

/**
 * Get upcoming festivals within the next N days.
 *
 * @param {number} daysAhead - How many days to look ahead (default: 7)
 * @param {string} vendorCategory - Vendor's business category
 * @returns {Array} Upcoming festivals with stock suggestions
 */
const getUpcomingFestivals = (daysAhead = 7, vendorCategory = 'general') => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const currentYear = now.getFullYear();

  const upcoming = [];
  const addedNames = new Set(); // Avoid duplicates when a fixed + recurring overlap

  // --- 1. Fixed-date festivals ---
  for (const fest of FIXED_FESTIVALS) {
    for (const yearOffset of [0, 1]) {
      const festDate = new Date(currentYear + yearOffset, fest.date.month, fest.date.day);
      if (festDate >= today && festDate <= cutoff) {
        const daysUntil = Math.ceil((festDate - today) / (24 * 60 * 60 * 1000));
        const relevantItems = getItemsForCategory(fest.items, vendorCategory);

        const key = `${fest.name}_${festDate.toDateString()}`;
        if (!addedNames.has(key)) {
          addedNames.add(key);
          upcoming.push({
            name: fest.name,
            date: festDate.toISOString(),
            daysUntil,
            type: fest.type,
            impact: fest.impact,
            relevantItems,
            suggestion: generateFestiveSuggestion(fest, vendorCategory, daysUntil, relevantItems),
          });
        }
      }
    }
  }

  // --- 2. Recurring events (Ekadashi, Purnima, Amavasya, etc.) ---
  for (const event of RECURRING_EVENTS) {
    for (const d of event.knownDates2026) {
      const eventDate = new Date(currentYear, d.month, d.day);
      if (eventDate >= today && eventDate <= cutoff) {
        const daysUntil = Math.ceil((eventDate - today) / (24 * 60 * 60 * 1000));
        const relevantItems = getItemsForCategory(event.items, vendorCategory);

        const key = `${event.name}_${eventDate.toDateString()}`;
        if (!addedNames.has(key)) {
          addedNames.add(key);
          upcoming.push({
            name: event.name,
            date: eventDate.toISOString(),
            daysUntil,
            type: event.type,
            impact: event.impact,
            relevantItems,
            suggestion: generateFestiveSuggestion(event, vendorCategory, daysUntil, relevantItems),
          });
        }
      }
    }
  }

  // --- 3. Seasonal tips (if within the right month) ---
  const currentMonth = now.getMonth();
  for (const season of SEASONAL_TIPS) {
    if (season.monthRange.includes(currentMonth)) {
      const relevantItems = getItemsForCategory(season.items, vendorCategory);
      // Only add if there's not already 6+ items in the feed
      if (upcoming.length < 6) {
        upcoming.push({
          name: `🌤️ ${season.name}`,
          date: now.toISOString(),
          daysUntil: 0,
          type: 'seasonal',
          impact: 'tip',
          relevantItems,
          suggestion: generateSeasonalSuggestion(season, vendorCategory, relevantItems),
        });
      }
    }
  }

  // Sort by days until (closest first)
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming;
};

/**
 * Get items for a specific vendor category with intelligent fallback.
 *
 * Priority: exact category → general → first available non-empty category
 */
const getItemsForCategory = (items, category) => {
  // 1. Exact match
  if (items[category] && items[category].length > 0) {
    return items[category];
  }
  // 2. General fallback
  if (items.general && items.general.length > 0) {
    return items.general;
  }
  // 3. First non-empty category
  for (const key of Object.keys(items)) {
    if (items[key] && items[key].length > 0) {
      return items[key];
    }
  }
  // 4. Absolute fallback from defaults
  return CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.general;
};

/**
 * Generate a natural-language suggestion for a festival/fasting day.
 */
const generateFestiveSuggestion = (fest, category, daysUntil, items) => {
  const itemList = items.slice(0, 3).join(', ');
  const timePhrase = daysUntil === 0
    ? 'today'
    : daysUntil === 1
    ? 'tomorrow'
    : `in ${daysUntil} days`;

  const categoryLabel = CATEGORY_LABELS[category] || category;

  // Fasting day — special messaging
  if (fest.type === 'fasting') {
    if (daysUntil <= 1) {
      return `${fest.name} is ${timePhrase}! People will fast — high demand for ${itemList}. Stock up now as ${categoryLabel} vendors see 30-50% more sales on fasting days.`;
    }
    return `${fest.name} is ${timePhrase}. Fasting day — prepare extra ${itemList}. These items sell fast during vrat.`;
  }

  // High demand festival
  if (fest.impact === 'high_demand') {
    if (daysUntil <= 1) {
      return `${fest.name} is ${timePhrase}! Massive demand expected for ${itemList}. Stock 30-50% extra to avoid running out — customers will be looking everywhere.`;
    }
    return `${fest.name} is ${timePhrase}! High demand expected for ${itemList}. Start preparing your inventory now.`;
  }

  // Regular/specific items festival
  if (daysUntil <= 1) {
    return `${fest.name} is ${timePhrase}. Stock extra ${itemList} — these items see higher demand during this occasion.`;
  }
  return `${fest.name} is ${timePhrase}. Consider stocking ${itemList} — these sell well during this festival.`;
};

/**
 * Generate seasonal advice.
 */
const generateSeasonalSuggestion = (season, category, items) => {
  const itemList = items.slice(0, 3).join(', ');
  return `It's ${season.name} season! ${itemList} are in high demand right now. Keep these well-stocked for consistent daily sales.`;
};

/**
 * Human-readable labels for vendor categories (used in suggestions).
 */
const CATEGORY_LABELS = {
  fruits: 'fruit',
  vegetables: 'vegetable',
  snacks: 'snacks',
  beverages: 'beverage',
  street_food: 'street food',
  sweets: 'sweets',
  dairy: 'dairy',
  flowers: 'flower',
  general: 'general',
};

module.exports = { getUpcomingFestivals, FIXED_FESTIVALS, RECURRING_EVENTS };

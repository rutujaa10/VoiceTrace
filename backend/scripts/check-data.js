require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('../src/models/LedgerEntry');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Entry = mongoose.model('LedgerEntry');
  const vid = '69c7eb0e9f67488368573907';

  // Check totals
  const result = await Entry.aggregate([
    { $match: { vendor: new mongoose.Types.ObjectId(vid) } },
    {
      $group: {
        _id: null,
        totalRev: { $sum: '$totalRevenue' },
        totalExp: { $sum: '$totalExpenses' },
        totalProfit: { $sum: '$netProfit' },
        count: { $sum: 1 },
      },
    },
  ]);
  console.log('Aggregate totals:', JSON.stringify(result, null, 2));

  // Check last 5 entries
  const entries = await Entry.find({ vendor: vid })
    .sort({ date: -1 })
    .limit(5)
    .lean();
  entries.forEach((e) => {
    console.log(
      `${e.date.toISOString().slice(0, 10)} | rev: ${e.totalRevenue} | exp: ${e.totalExpenses} | profit: ${e.netProfit} | items: ${e.items.length}`
    );
  });

  await mongoose.disconnect();
});

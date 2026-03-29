import fs from 'fs';
const file = 'src/views/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Missing closing div
content = content.replace(
  '        </div>\n      )}\n\n      {/* ----------- WEEKLY PATTERNS (3-col bento) ----------- */}',
  '        </div>\n      )}\n      </div>\n\n      {/* ----------- WEEKLY PATTERNS (3-col bento) ----------- */}'
);

// 2. Dummy data 1
const dummyTop1 = "            stockSuggestions: [\n              { item: 'Samosa', suggestion: 'Prepare 30 extra', reason: 'High weekend demand predicted' },\n              { item: 'Chai Leaves', suggestion: 'Stock 2kg more', reason: 'High correlation with evening snacks' }\n            ]";
const dummyRep1 = dummyTop1 + ",\n            bestSeller: { name: 'Samosa', totalQuantity: 142, totalRevenue: 2840, daysAppeared: 7 },\n            peakDay: { dayName: 'Sunday', revenue: 5420, date: new Date(Date.now() - 2*86400000).toISOString() },\n            missedProfits: { totalLoss: 850, topMissedItems: [{item: 'Patties'}, {item: 'Cold Drink'}] }";
content = content.replace(dummyTop1, dummyRep1);

// 3. Dummy data 2
const dummyTop2 = "          stockSuggestions: [\n            { item: 'Samosa', suggestion: 'Prepare 30 extra', reason: 'High weekend demand predicted' },\n            { item: 'Chai Leaves', suggestion: 'Stock 2kg more', reason: 'High correlation with evening snacks' }\n          ]";
const dummyRep2 = dummyTop2 + ",\n          bestSeller: { name: 'Samosa', totalQuantity: 142, totalRevenue: 2840, daysAppeared: 7 },\n          peakDay: { dayName: 'Sunday', revenue: 5420, date: new Date(Date.now() - 2*86400000).toISOString() },\n          missedProfits: { totalLoss: 850, topMissedItems: [{item: 'Patties'}, {item: 'Cold Drink'}] }";
content = content.replace(dummyTop2, dummyRep2);

// 4. Loan Readiness
const loanTargetStart = content.indexOf('{/* ----------- LOAN READINESS (Bottom) ----------- */}');
const loanTargetEnd = content.indexOf('      {/* --- Responsive Overrides --- */}', loanTargetStart);
const loanRep = \      {/* ----------- LOAN READINESS (Bottom) ----------- */}
      <div
        className="loan-readiness-grid"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)',
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr',
          alignItems: 'center',
          gap: '32px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={22} style={{ color: 'var(--primary-500)' }} /> Micro-Loan Readiness
          </h2>
          <LoanGauge
            score={loan.score || 0}
            isReady={loan.isLoanReady || false}
            streak={loan.streak || 0}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', height: '100%' }}>
          {[
            { key: 'streakScore', label: 'Logging Streak', bg: '#a855f7', icon: <Flame color="white" size={24} />, val: loan.breakdown?.streakScore || 0 },
            { key: 'stabilityScore', label: 'Revenue Stability', bg: '#1f2937', icon: <BarChart2 color="white" size={24} />, val: loan.breakdown?.stabilityScore || 0 },
            { key: 'revenueScore', label: 'Avg Revenue', bg: '#06b6d4', icon: <TrendingUp color="white" size={24} />, val: loan.breakdown?.revenueScore || 0 },
            { key: 'expenseScore', label: 'Expense Tracking', bg: '#3b82f6', icon: <FileText color="white" size={24} />, val: loan.breakdown?.expenseScore || 0 }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: item.bg,
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: 'white',
                minHeight: '140px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {item.icon}
                <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'rgba(255,255,255,0.85)' }}>{Math.round(item.val * 10) / 10}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
\n;
content = content.substring(0, loanTargetStart) + loanRep + content.substring(loanTargetEnd);

// 5. Swap Insights and PDF
const aiInsightsStart = content.indexOf('{/* AI Insights Box */}');
const divStart = content.lastIndexOf('<div', aiInsightsStart);
const divEnd = content.indexOf('>', divStart) + 1;
const pdfExportStart = content.indexOf('{/* PDF Export - Full Horizontal */}', aiInsightsStart);
const afterPdfExport = content.indexOf('</button>', pdfExportStart) + 9;

const aiCode = content.substring(aiInsightsStart, pdfExportStart).trimEnd();
let pdfCode = content.substring(pdfExportStart, afterPdfExport).trimEnd();
pdfCode = pdfCode.replace("width: '100%',", "width: '100%', height: '100%',");

const newWrapper = '<div className="insights-actions-grid" style={{ display: \"grid\", gridTemplateColumns: \"3fr 1fr\", gap: \"16px\", marginBottom: \"24px\", alignItems: \"stretch\" }}>';

content = content.substring(0, divStart) 
  + newWrapper + '\n        '
  + pdfCode + '\n\n        '
  + aiCode + '\n      '
  + content.substring(afterPdfExport);

// 6. CSS
content = content.replace(
  '.bento-patterns-grid { grid-template-columns: repeat(2, 1fr) !important; }',
  '.bento-patterns-grid { grid-template-columns: repeat(2, 1fr) !important; }\n          .loan-readiness-grid { grid-template-columns: 1fr !important; }\n          .insights-actions-grid { grid-template-columns: 1fr !important; }'
);

content = content.replace(
  '.bento-patterns-grid { grid-template-columns: 1fr !important; }',
  '.bento-patterns-grid { grid-template-columns: 1fr !important; }\n          .insights-actions-grid { grid-template-columns: 1fr !important; }'
);

fs.writeFileSync(file, content);
console.log('Restored fully!');

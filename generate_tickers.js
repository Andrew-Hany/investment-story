const fs = require('fs');
const path = require('path');

const pricesDir = path.join(__dirname, 'public', 'data', 'prices');
const fundamentalsDir = path.join(__dirname, 'public', 'data', 'fundamentals');
const indexDir = path.join(__dirname, 'public', 'data', 'index');
const outputFilePath = path.join(__dirname, 'public', 'data', 'tickers.json');

function loadIndexMetadata() {
  const metadata = new Map();
  const indexConfigs = [
    { file: 'egx30.json', benchmarkName: 'EGX 30 Index', benchmarkCurrency: 'EGP', benchmark: '^CASE30' },
    { file: 'nasdaq100.json', benchmarkName: 'Invesco QQQ Trust', benchmarkCurrency: 'USD' }
  ];

  indexConfigs.forEach(config => {
    const indexPath = path.join(indexDir, config.file);
    if (!fs.existsSync(indexPath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      (data.holdings || []).forEach(holding => {
        if (holding.ticker && holding.name) {
          metadata.set(holding.ticker, {
            name: holding.name,
            currency: holding.currency
          });
        }
      });
      if (data.benchmark_proxy) {
        metadata.set(data.benchmark_proxy, {
          name: config.benchmarkName,
          currency: config.benchmarkCurrency
        });
      }
    } catch (err) {
      // Fallback to ticker names.
    }
  });

  return metadata;
}

function loadUniverseMemberships() {
  const memberships = new Map();
  const universeConfigs = [
    {
      id: 'sp500',
      label: 'S&P 500 / SPY',
      file: 'sp500.json',
      benchmark: 'SPY'
    },
    {
      id: 'egx30',
      label: 'EGX 30',
      file: 'egx30.json',
      benchmark: '^CASE30'
    },
    {
      id: 'nasdaq100',
      label: 'Nasdaq-100 / QQQ',
      file: 'nasdaq100.json',
      benchmark: 'QQQ'
    }
  ];

  const addMembership = (ticker, universe) => {
    if (!ticker) return;
    const normalized = ticker.trim().toUpperCase();
    const current = memberships.get(normalized) || [];
    if (!current.some(item => item.id === universe.id)) {
      current.push({ id: universe.id, label: universe.label });
    }
    memberships.set(normalized, current);
  };

  universeConfigs.forEach(universe => {
    const indexPath = path.join(indexDir, universe.file);
    if (!fs.existsSync(indexPath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      (data.holdings || []).forEach(holding => addMembership(holding.ticker, universe));
      addMembership(universe.benchmark || data.benchmark_proxy, universe);
    } catch (err) {
      // Fallback to uncategorized tickers.
    }
  });

  return memberships;
}

const files = fs.readdirSync(pricesDir);
const indexMetadata = loadIndexMetadata();
const universeMemberships = loadUniverseMemberships();
const tickers = [];

files.forEach(file => {
  if (file.endsWith('.json') && file !== 'tickers.json') {
    const ticker = file.replace('.json', '');
    const metadata = indexMetadata.get(ticker) || {};
    let name = metadata.name || ticker;
    let currency = metadata.currency || 'USD';
    
    // Attempt to load corresponding fundamental name
    const fundamentalPath = path.join(fundamentalsDir, `${ticker}.json`);
    if (fs.existsSync(fundamentalPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(fundamentalPath, 'utf8'));
        name = (data.company && (data.company.shortName || data.company.longName || data.company.name)) || ticker;
      } catch (err) {
        // Fallback to ticker
      }
    }
    
    tickers.push({
      ticker,
      name,
      currency,
      universes: universeMemberships.get(ticker.toUpperCase()) || []
    });
  }
});

// Sort by ticker alphabetically, but prioritize major ETFs and Indices
const PRIORITY_TICKERS = ["SP500", "SPY", "QQQ", "^CASE30", "VOO", "IVV", "VTI"];

tickers.sort((a, b) => {
  const aPrio = PRIORITY_TICKERS.indexOf(a.ticker);
  const bPrio = PRIORITY_TICKERS.indexOf(b.ticker);
  
  if (aPrio !== -1 && bPrio === -1) return -1;
  if (aPrio === -1 && bPrio !== -1) return 1;
  if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio; // Sort relative to their priority order
  
  return a.ticker.localeCompare(b.ticker);
});

fs.writeFileSync(outputFilePath, JSON.stringify(tickers, null, 2), 'utf8');
console.log(`Successfully generated ${tickers.length} tickers inside ${outputFilePath}`);

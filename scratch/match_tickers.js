import fs from 'fs';
import path from 'path';

const pricesDir = './public/data/prices';
const tickersFile = './public/data/tickers.json';
const outputFile = './public/data/available_tickers.json';

try {
  const priceFiles = fs.readdirSync(pricesDir);
  const validTickers = new Set(
    priceFiles
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5).toUpperCase())
  );

  const tickersData = JSON.parse(fs.readFileSync(tickersFile, 'utf8'));

  const available = tickersData.filter(t => validTickers.has(t.ticker.toUpperCase()));

  fs.writeFileSync(outputFile, JSON.stringify(available, null, 2));
  console.log(`Successfully wrote ${available.length} available tickers to ${outputFile}`);
} catch (err) {
  console.error('Error matching tickers:', err);
}

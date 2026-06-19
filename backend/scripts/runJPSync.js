/**
 * Run Joshua Project sync as a one-off CLI script.
 *
 * Usage:
 *   node scripts/runJPSync.js                # Sync world-wide
 *   node scripts/runJPSync.js --country=CM   # Sync only Cameroon
 *   node scripts/runJPSync.js --dry-run      # Analyse without saving
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { syncJoshuaProject } = require('../routes/joshuaProjectSync');

const args = process.argv.slice(2);
const countryArg = args.find(a => a.startsWith('--country='));
const filterCountry = countryArg ? countryArg.split('=')[1].toUpperCase() : null;
const dryRun = args.includes('--dry-run');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
  console.log(`🔌 Connecting to MongoDB: ${uri.replace(/:\/\/[^@]+@/, '://***@')}`);

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    const stats = await syncJoshuaProject({
      adminId: null,
      filterCountry,
      dryRun,
    });

    console.log('\n📦 RÉSULTAT FINAL:', JSON.stringify({
      status: stats.status,
      totalFetched: stats.totalFetched,
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      errors: stats.errors,
      duration: stats.duration,
      lastError: stats.lastError,
    }, null, 2));

    process.exit(stats.status === 'completed' ? 0 : 1);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();

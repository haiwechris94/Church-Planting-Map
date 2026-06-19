require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const m = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
const fs = require('fs');
const out = require('path').join(__dirname, '_check_jp_result.json');

(async () => {
  try {
    await m.connect(uri);
    const c = m.connection.db.collection('peoplegroups');
    const total = await c.countDocuments({});
    const jp = await c.countDocuments({ source: 'Joshua Project' });
    const sources = await c.distinct('source');
    const sample = await c.find({ source: 'Joshua Project' }).limit(2).toArray();
    const noLoc = await c.countDocuments({
      source: 'Joshua Project',
      $or: [{ location: null }, { 'location.coordinates': { $size: 0 } }, { location: { $exists: false } }]
    });
    const approvedFalse = await c.countDocuments({ source: 'Joshua Project', approved: false });
    const byCountry = await c.aggregate([
      { $match: { source: 'Joshua Project' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    const result = {
      total, jpCount: jp, jpWithoutLocation: noLoc, jpNotApproved: approvedFalse,
      sources, byCountry,
      sample: sample.map(s => ({
        name: s.name, country: s.country, source: s.source,
        hasLoc: !!(s.location && s.location.coordinates && s.location.coordinates.length),
        coords: s.location && s.location.coordinates,
        approved: s.approved
      }))
    };
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log('OK:', out);
  } catch (e) {
    fs.writeFileSync(out, JSON.stringify({ error: e.message }, null, 2));
    console.error('ERR', e.message);
  } finally {
    await m.disconnect();
  }
})();

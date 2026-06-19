/**
 * Joshua Project Live Sync — API routes
 *
 * Wraps the live sync engine from ./joshuaProjectSync.js with HTTP endpoints.
 *
 * Endpoints:
 *   POST /api/jp-sync/trigger        - Lance une sync (body: { country?, dryRun? })
 *   GET  /api/jp-sync/status         - État de la sync (en cours, dernière, prochaine CRON)
 *   POST /api/jp-sync/cron/enable    - Active le CRON hebdomadaire
 *   POST /api/jp-sync/cron/disable   - Désactive le CRON hebdomadaire
 */

const express = require('express');
const router = express.Router();

const { triggerSync, getSyncState } = require('./joshuaProjectSync');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jp-sync/trigger
// Lance une synchronisation en arrière-plan (non-bloquant)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/trigger', async (req, res) => {
  try {
    const { country = null, dryRun = false } = req.body || {};
    const adminId = req.user?._id || null;

    const result = await triggerSync({
      adminId,
      filterCountry: country ? String(country).toUpperCase() : null,
      dryRun: Boolean(dryRun),
    });

    return res.json({
      success: true,
      ...result,
      state: getSyncState(),
    });
  } catch (err) {
    console.error('[jpSyncApi] trigger error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to start Joshua Project sync',
      details: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jp-sync/status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  return res.json({
    success: true,
    state: getSyncState(),
  });
});

module.exports = router;

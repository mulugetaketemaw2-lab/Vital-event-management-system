const express = require('express');
const locationController = require('../controllers/locationController');
const authController = require('../controllers/authController');
const router = express.Router();

// Public routes
router.get('/regions', locationController.getRegions);
router.get('/zones/:regionId', locationController.getZonesByRegion);
router.get('/woredas/:zoneId', locationController.getWoredasByZone);
router.get('/kebeles/:woredaId', locationController.getKebelesByWoreda);

// Debug route to check all locations
router.get('/debug-all', async (req, res) => {
  try {
    const regions = await Location.find({ type: 'region' });
    const zones = await Location.find({ type: 'zone' });
    const woredas = await Location.find({ type: 'woreda' });
    const kebeles = await Location.find({ type: 'kebele' });
    
    res.json({
      regionsCount: regions.length,
      zonesCount: zones.length,
      woredasCount: woredas.length,
      kebelesCount: kebeles.length,
      regions: regions.map(r => ({ id: r._id, name: r.name, code: r.code })),
      sampleZones: zones.slice(0, 3).map(z => ({ id: z._id, name: z.name, parent: z.parent })),
      sampleWoredas: woredas.slice(0, 3).map(w => ({ id: w._id, name: w.name, parent: w.parent })),
      sampleKebeles: kebeles.slice(0, 3).map(k => ({ id: k._id, name: k.name, parent: k.parent }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reinitialize locations (for development)
router.post('/initialize',
  authController.protect,
  (req, res, next) => {
    if (req.user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can access this endpoint'
      });
    }
    next();
  },
  locationController.initializeLocations
);

// Get pending approvals for national representatives
// router.get('/pending-approvals',
//   authController.protect,
//   authController.getPendingApprovals
// );

module.exports = router;

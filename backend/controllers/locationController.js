const Location = require('../models/Location');

// Initialize sample data if empty
const initializeSampleData = async () => {
  try {
    const count = await Location.countDocuments();
    if (count === 0) {
      console.log('Initializing sample location data...');
      
      // Create regions
      const regions = [
        { name: 'Addis Ababa', type: 'region', code: 'AA' },
        { name: 'Oromia', type: 'region', code: 'OR' },
        { name: 'Amhara', type: 'region', code: 'AM' },
        { name: 'Tigray', type: 'region', code: 'TG' },
        { name: 'Somali', type: 'region', code: 'SO' }
      ];
      
      const createdRegions = await Location.insertMany(regions);
      
      console.log(`✅ Created ${createdRegions.length} sample regions`);
      
      // For each region, create some zones, woredas, and kebeles
      for (const region of createdRegions) {
        // Create 2 zones per region
        for (let i = 1; i <= 2; i++) {
          const zone = await Location.create({
            name: `${region.name} Zone ${i}`,
            type: 'zone',
            parent: region._id,
            code: `${region.code}_Z${i}`
          });
          
          // Create 2 woredas per zone
          for (let j = 1; j <= 2; j++) {
            const woreda = await Location.create({
              name: `${zone.name} Woreda ${j}`,
              type: 'woreda',
              parent: zone._id,
              code: `${zone.code}_W${j}`
            });
            
            // Create 2 kebeles per woreda
            for (let k = 1; k <= 2; k++) {
              await Location.create({
                name: `${woreda.name} Kebele ${k}`,
                type: 'kebele',
                parent: woreda._id,
                code: `${woreda.code}_K${k}`
              });
            }
          }
        }
      }
      
      console.log('Sample location data initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};

// Initialize on startup
initializeSampleData();


exports.getRegions = async (req, res) => {
  try {
    const regions = await Location.find({ type: 'region' });
    
    if (regions.length === 0) {
      await initializeSampleData();
      const refreshedRegions = await Location.find({ type: 'region' });
      return res.status(200).json({
        status: 'success',
        data: {
          regions: refreshedRegions
        }
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        regions
      }
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getZonesByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    
    if (!regionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Region ID is required'
      });
    }

    const zones = await Location.find({ 
      type: 'zone', 
      parent: regionId 
    }).sort({ name: 1 });
    
    res.status(200).json({
      status: 'success',
      data: {
        zones
      }
    });
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Failed to fetch zones'
    });
  }
};

exports.getWoredasByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    
    if (!zoneId) {
      return res.status(400).json({
        status: 'error',
        message: 'Zone ID is required'
      });
    }

    const woredas = await Location.find({ 
      type: 'woreda', 
      parent: zoneId 
    }).sort({ name: 1 });
    
    res.status(200).json({
      status: 'success',
      data: {
        woredas
      }
    });
  } catch (error) {
    console.error('Get woredas error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Failed to fetch woredas'
    });
  }
};

exports.getKebelesByWoreda = async (req, res) => {
  try {
    const { woredaId } = req.params;
    
    if (!woredaId) {
      return res.status(400).json({
        status: 'error',
        message: 'Woreda ID is required'
      });
    }

    const kebeles = await Location.find({ 
      type: 'kebele', 
      parent: woredaId 
    }).sort({ name: 1 });
    
    res.status(200).json({
      status: 'success',
      data: {
        kebeles
      }
    });
  } catch (error) {
    console.error('Get kebeles error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Failed to fetch kebeles'
    });
  }
};

// Initialize sample locations if none exist
exports.initializeLocations = async (req, res) => {
  try {
    const count = await Location.countDocuments();
    
    if (count === 0) {
      // Create sample regions
      const regions = await Location.insertMany([
        { name: 'Addis Ababa', type: 'region', code: 'AA' },
        { name: 'Amhara', type: 'region', code: 'AM' },
        { name: 'Oromia', type: 'region', code: 'OR' },
        { name: 'Tigray', type: 'region', code: 'TI' },
        { name: 'Southern Nations, Nationalities, and Peoples\' Region', type: 'region', code: 'SN' }
      ]);

      // Create sample zones for Amhara
      const amharaZones = await Location.insertMany([
        { name: 'South Wollo', type: 'zone', parent: regions[1]._id, code: 'AM_SW' },
        { name: 'North Wollo', type: 'zone', parent: regions[1]._id, code: 'AM_NW' },
        { name: 'Gondar', type: 'zone', parent: regions[1]._id, code: 'AM_GD' }
      ]);

      // Create sample woredas for South Wollo
      const southWolloWoredas = await Location.insertMany([
        { name: 'Dessie Zuria', type: 'woreda', parent: amharaZones[0]._id, code: 'AM_SW_DZ' },
        { name: 'Kutaber', type: 'woreda', parent: amharaZones[0]._id, code: 'AM_SW_KB' },
        { name: 'Tenta', type: 'woreda', parent: amharaZones[0]._id, code: 'AM_SW_TE' }
      ]);

      // Create sample kebeles for Dessie Zuria
      await Location.insertMany([
        { name: 'Dessie Town Kebele 01', type: 'kebele', parent: southWolloWoredas[0]._id, code: 'AM_SW_DZ_01' },
        { name: 'Dessie Town Kebele 02', type: 'kebele', parent: southWolloWoredas[0]._id, code: 'AM_SW_DZ_02' },
        { name: 'Dessie Town Kebele 03', type: 'kebele', parent: southWolloWoredas[0]._id, code: 'AM_SW_DZ_03' }
      ]);

      return res.status(201).json({
        status: 'success',
        message: 'Sample location data initialized successfully'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Location data already exists'
    });
  } catch (error) {
    console.error('Initialize locations error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Failed to initialize locations'
    });
  }
};
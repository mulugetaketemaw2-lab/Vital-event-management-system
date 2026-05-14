const Location = require('../models/Location');

const seedLocations = async () => {
  try {
    const count = await Location.countDocuments();
    if (count === 0) {
      console.log('🌍 Seeding location data...');

      // Create regions
      const regions = [
        { name: 'Addis Ababa', type: 'region', code: 'AA' },
        { name: 'Afar', type: 'region', code: 'AF' },
        { name: 'Amhara', type: 'region', code: 'AM' },
        { name: 'Benishangul-Gumuz', type: 'region', code: 'BG' },
        { name: 'Dire Dawa', type: 'region', code: 'DD' },
        { name: 'Gambela', type: 'region', code: 'GA' },
        { name: 'Harari', type: 'region', code: 'HA' },
        { name: 'Oromia', type: 'region', code: 'OR' },
        { name: 'Sidama', type: 'region', code: 'SI' },
        { name: 'Somali', type: 'region', code: 'SO' },
        { name: 'Southern Nations, Nationalities, and Peoples\' Region', type: 'region', code: 'SN' },
        { name: 'South West Ethiopia Peoples\' Region', type: 'region', code: 'SW' },
        { name: 'Tigray', type: 'region', code: 'TI' }
      ];

      const createdRegions = await Location.insertMany(regions);
      console.log('✅ Regions seeded successfully');

      // Create sample zones for each region
      for (const region of createdRegions) {
        const zones = [];
        for (let i = 1; i <= 3; i++) {
          zones.push({
            name: `${region.name} Zone ${i}`,
            type: 'zone',
            parent: region._id,
            code: `${region.code}_Z${i}`
          });
        }
        const createdZones = await Location.insertMany(zones);

        // Create sample woredas for each zone
        for (const zone of createdZones) {
          const woredas = [];
          for (let i = 1; i <= 3; i++) {
            woredas.push({
              name: `${zone.name} Woreda ${i}`,
              type: 'woreda',
              parent: zone._id,
              code: `${zone.code}_W${i}`
            });
          }
          const createdWoredas = await Location.insertMany(woredas);

          // Create sample kebeles for each woreda
          for (const woreda of createdWoredas) {
            const kebeles = [];
            for (let i = 1; i <= 3; i++) {
              kebeles.push({
                name: `${woreda.name} Kebele ${i}`,
                type: 'kebele',
                parent: woreda._id,
                code: `${woreda.code}_K${i}`
              });
            }
            await Location.insertMany(kebeles);
          }
        }
      }

      console.log('✅ All location data seeded successfully');
    } else {
      console.log('✅ Location data already exists');
    }
  } catch (error) {
    console.error('❌ Error seeding location data:', error);
  }
};

module.exports = seedLocations;
try {
    console.log('1. cors'); require('cors');
    console.log('2. path'); require('path');
    console.log('3. locationSeeder'); require('./utils/locationSeeder');
    console.log('4. statsRoutes'); require('./routes/statsRoutes');
    console.log('5. authRoutes'); require('./routes/authRoutes');
    console.log('6. vitalEventRoutes'); require('./routes/vitalEventRoutes');
    console.log('7. locationRoutes'); require('./routes/locationRoutes');
    console.log('8. representativeRoutes'); require('./routes/representativeRoutes');
    console.log('9. certificateRoutes'); require('./routes/certificateRoutes');
    console.log('10. reportRoutes'); require('./routes/reportRoutes');
    console.log('11. paymentRoutes'); require('./routes/paymentRoutes');
    console.log('All modules loaded successfully');
} catch (e) {
    console.error('FAIL at module:', e.message);
    console.error(e.stack);
    process.exit(1);
}

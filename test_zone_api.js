// Test script to verify Zone API endpoints
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testZoneAPI() {
  console.log('🔧 Testing Zone API Endpoints...\n');
  
  // Test 1: Login as zone representative (you'll need to provide credentials)
  try {
    console.log('1️⃣ Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'zone_user', // Replace with actual zone username
      password: 'password'    // Replace with actual password
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.data.user;
    
    console.log('✅ Login successful');
    console.log('👤 User role:', user.role);
    console.log('📍 User location:', user.location);
    
    // Set authorization header for subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Test 2: Get zone overview
    console.log('\n2️⃣ Testing zone overview...');
    const overviewResponse = await axios.get(`${API_URL}/auth/zone/overview`);
    console.log('✅ Zone overview successful');
    console.log('📊 Citizens:', overviewResponse.data.data.citizens?.length || 0);
    console.log('📋 Events:', overviewResponse.data.data.events?.length || 0);
    
    // Test 3: Generate zone report
    console.log('\n3️⃣ Testing zone report generation...');
    const reportResponse = await axios.post(`${API_URL}/auth/zone/generate-report`, {
      reportType: 'all',
      startDate: '2026-03-01',
      endDate: '2026-03-06'
    });
    console.log('✅ Zone report generation successful');
    console.log('📈 Report data keys:', Object.keys(reportResponse.data.data));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication failed - check credentials');
    } else if (error.response?.status === 403) {
      console.log('🚫 Access denied - check user role and permissions');
    } else if (error.response?.status === 404) {
      console.log('🔍 Endpoint not found - check backend routes');
    }
  }
}

// Run the test
testZoneAPI();

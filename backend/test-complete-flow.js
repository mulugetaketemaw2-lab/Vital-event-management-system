console.log('🔍 Testing Complete Regional Dashboard Flow...');

// Test 1: Check if backend server is running
async function testBackendConnection() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/regional/overview', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token-regional',
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Backend Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is working!');
      console.log('📊 Citizens returned:', data.data?.citizens?.length || 0);
      console.log('📈 Stats:', data.data?.stats);
      
      return { success: true, data };
    } else {
      const errorData = await response.json();
      console.log('❌ Backend Error:', errorData);
      return { success: false, error: errorData };
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 2: Check frontend API_URL configuration
function checkFrontendConfig() {
  console.log('\n🔧 Checking Frontend Configuration...');
  
  // Check if API_URL is correctly set
  const API_URL = 'http://localhost:5000'; // This should match what's in AuthContext
  console.log('📡 Frontend API_URL:', API_URL);
  
  // Check the exact URL that would be called
  const fullUrl = `${API_URL}/api/auth/regional/overview`;
  console.log('🌐 Full URL that will be called:', fullUrl);
  
  return { API_URL, fullUrl };
}

// Test 3: Simulate the exact frontend fetch
async function simulateFrontendFetch() {
  console.log('\n🎭 Simulating Frontend Fetch...');
  
  try {
    const API_URL = 'http://localhost:5000';
    const response = await fetch(`${API_URL}/api/auth/regional/overview`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token-regional',
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Frontend simulation successful!');
      console.log('📊 Data structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      
      // Simulate what the frontend would do
      if (data.status === 'success') {
        const citizens = data.data.citizens || [];
        const stats = data.data.stats || {};
        
        console.log('🔄 Frontend state update simulation:');
        console.log('  - setCitizens length:', citizens.length);
        console.log('  - setStats:', stats);
        
        return { success: true, citizens, stats };
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Frontend simulation failed:', errorData);
      return { success: false, error: errorData };
    }
  } catch (error) {
    console.error('❌ Frontend simulation error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Complete Flow Test...\n');
  
  // Test 1: Backend connection
  const backendTest = await testBackendConnection();
  
  // Test 2: Frontend config
  const configTest = checkFrontendConfig();
  
  // Test 3: Frontend simulation
  const frontendTest = await simulateFrontendFetch();
  
  // Summary
  console.log('\n📋 TEST SUMMARY:');
  console.log('✅ Backend Connection:', backendTest.success ? 'PASS' : 'FAIL');
  console.log('✅ Frontend Config:', configTest.API_URL ? 'PASS' : 'FAIL');
  console.log('✅ Frontend Simulation:', frontendTest.success ? 'PASS' : 'FAIL');
  
  if (backendTest.success && frontendTest.success) {
    console.log('\n🎉 ALL TESTS PASSED! The issue might be in the frontend component itself.');
    console.log('💡 Next steps: Check browser console for JavaScript errors and network tab for failed requests.');
  } else {
    console.log('\n❌ SOME TESTS FAILED! Check the error messages above.');
  }
}

// Run the tests
runAllTests();

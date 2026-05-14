const axios = require('axios');

async function testRegionalAPI() {
  try {
    console.log('🔍 Testing Regional API Endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/auth/regional/overview', {
      headers: {
        'Authorization': 'Bearer test-token-regional',
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'success') {
      const data = response.data.data;
      console.log('✅ Success! Citizens found:', data.citizens?.length || 0);
      console.log('📈 Stats:', data.stats);
      
      // Show citizen details
      if (data.citizens && data.citizens.length > 0) {
        console.log('\n👥 Citizens Details:');
        data.citizens.forEach((citizen, index) => {
          console.log(`${index + 1}. ${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName} - Status: ${citizen.status}`);
        });
      }
    } else {
      console.log('❌ API Error:', response.data.message);
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testRegionalAPI();

const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');

// Test script for report transmission functionality
async function testReportTransmission() {
  try {
    console.log('🔧 Testing Report Transmission API...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    const API_URL = 'http://localhost:5000/api';

    // Step 1: Login as a region representative to get token
    console.log('\n📝 Step 1: Logging in as region representative...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'Addis Ababa', // Using existing region user
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Test sending a report to national level
    console.log('\n📤 Step 2: Sending report to national level...');
    const reportData = {
      reportType: 'daily',
      reportLevel: 'region',
      period: {
        startDate: '2026-03-05',
        endDate: '2026-03-05'
      },
      reportData: {
        citizens: {
          total: 150,
          approved: 120,
          rejected: 20,
          verified: 110,
          byZone: {
            'Zone 1': 50,
            'Zone 2': 60,
            'Zone 3': 40
          }
        },
        events: {
          total: 80,
          completed: 70,
          rejected: 10,
          byType: {
            'Birth': 40,
            'Death': 20,
            'Marriage': 15,
            'Divorce': 5
          },
          byStatus: {
            'Pending': 5,
            'Approved': 70,
            'Rejected': 5
          },
          byZone: {
            'Zone 1': 25,
            'Zone 2': 30,
            'Zone 3': 25
          }
        }
      },
      notes: 'Test daily report from Addis Ababa region'
    };

    const sendResponse = await axios.post(`${API_URL}/report-transmission/send`, reportData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Report sent successfully:', sendResponse.data.data);
    const reportId = sendResponse.data.data.reportId;

    // Step 3: Login as national representative to check received reports
    console.log('\n📝 Step 3: Logging in as national representative...');
    const nationalLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'national.rep',
      password: 'password123'
    });

    const nationalToken = nationalLoginResponse.data.data.token;
    console.log('✅ National login successful');

    // Step 4: Test fetching received reports
    console.log('\n📥 Step 4: Fetching received reports for national level...');
    const receivedResponse = await axios.get(`${API_URL}/report-transmission/received`, {
      headers: { Authorization: `Bearer ${nationalToken}` }
    });

    console.log('✅ Received reports fetched successfully');
    console.log('📊 Number of received reports:', receivedResponse.data.data.transmissions.length);
    
    if (receivedResponse.data.data.transmissions.length > 0) {
      const report = receivedResponse.data.data.transmissions[0];
      console.log('📋 Sample report:', {
        reportId: report.reportId,
        fromLevel: report.fromLevel,
        toLevel: report.toLevel,
        status: report.status,
        transmittedAt: report.transmittedAt
      });
    }

    // Step 5: Test fetching sent reports (as region rep)
    console.log('\n📤 Step 5: Fetching sent reports for region level...');
    const sentResponse = await axios.get(`${API_URL}/report-transmission/sent`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Sent reports fetched successfully');
    console.log('📊 Number of sent reports:', sentResponse.data.data.transmissions.length);

    // Step 6: Test getting report details
    if (reportId) {
      console.log('\n📋 Step 6: Fetching report details...');
      const detailsResponse = await axios.get(`${API_URL}/report-transmission/${reportId}`, {
        headers: { Authorization: `Bearer ${nationalToken}` }
      });

      console.log('✅ Report details fetched successfully');
      console.log('📊 Report details:', {
        reportId: detailsResponse.data.data.reportId,
        reportType: detailsResponse.data.data.reportType,
        status: detailsResponse.data.data.status,
        fromUser: detailsResponse.data.data.fromUser?.personalInfo?.firstName,
        toUser: detailsResponse.data.data.toUser?.personalInfo?.firstName
      });
    }

    // Step 7: Test marking report as received
    if (reportId) {
      console.log('\n✅ Step 7: Marking report as received...');
      await axios.patch(`${API_URL}/report-transmission/${reportId}/receive`, {}, {
        headers: { Authorization: `Bearer ${nationalToken}` }
      });
      console.log('✅ Report marked as received');
    }

    // Step 8: Test marking report as reviewed
    if (reportId) {
      console.log('\n👁️ Step 8: Marking report as reviewed...');
      await axios.patch(`${API_URL}/report-transmission/${reportId}/review`, {}, {
        headers: { Authorization: `Bearer ${nationalToken}` }
      });
      console.log('✅ Report marked as reviewed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Report transmission API is working');
    console.log('- ✅ Reports can be sent between levels');
    console.log('- ✅ Reports can be fetched (received/sent)');
    console.log('- ✅ Report details can be viewed');
    console.log('- ✅ Report status can be updated');
    console.log('- ✅ All API endpoints are functional');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testReportTransmission();

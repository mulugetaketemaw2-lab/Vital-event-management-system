const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testWithCitizen(username, password) {
    console.log(`\nTesting with user: ${username}`);
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username,
            password
        });
        const token = loginRes.data.token;
        const user = loginRes.data.data.user;
        console.log('Login OK. isActive:', user.isActive, 'isApproved:', user.isApproved, 'role:', user.role);

        const form = new FormData();
        form.append('type', 'birth');
        form.append('location', JSON.stringify({
            region: 'Addis Ababa',
            zone: 'Addis Ketema',
            woreda: 'Ammanuel Area',
            kebele: 'Amanuel kebele01'
        }));
        form.append('eventDate', '2023-05-01');
        form.append('childName', 'Test Child ' + Date.now());
        form.append('gender', 'male');
        form.append('placeOfBirth', 'Ammanuel Area');
        form.append('fatherName', 'John Doe');
        form.append('motherName', 'Jane Doe');

        fs.writeFileSync('dummy.jpg', 'dummy');
        fs.writeFileSync('dummy.pdf', 'dummy');

        form.append('childPhoto', fs.createReadStream('dummy.jpg'));
        form.append('fatherPhoto', fs.createReadStream('dummy.jpg'));
        form.append('motherPhoto', fs.createReadStream('dummy.jpg'));
        form.append('documents', fs.createReadStream('dummy.pdf'));

        const res = await axios.post('http://localhost:5000/api/events', form, {
            headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
            timeout: 30000
        });

        console.log('SUCCESS:', res.data.status);
    } catch (error) {
        console.error('ERROR:', JSON.stringify(error.response?.data || error.message));
    } finally {
        if (fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
        if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
    }
}

// Test with active citizen
testWithCitizen('sekina', 'password123')
    .then(() => testWithCitizen('firdi', 'password123'))
    .then(() => process.exit(0));

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testSubmit() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'national.rep',
            password: 'password123'
        });
        const token = loginRes.data.token;

        const form = new FormData();
        form.append('type', 'birth');
        form.append('location', JSON.stringify({
            region: 'Amhara',
            zone: 'North',
            woreda: 'Woreda 1',
            kebele: 'Kebele 1'
        }));
        form.append('eventDate', '2023-01-01');
        form.append('childName', 'Test Child');
        form.append('gender', 'male');
        form.append('placeOfBirth', 'Hospital');
        form.append('fatherName', 'John Doe');
        form.append('motherName', 'Jane Doe');

        // Create dummy files
        fs.writeFileSync('dummy.jpg', 'dummy');
        fs.writeFileSync('dummy.pdf', 'dummy');

        form.append('childPhoto', fs.createReadStream('dummy.jpg'));
        form.append('fatherPhoto', fs.createReadStream('dummy.jpg'));
        form.append('motherPhoto', fs.createReadStream('dummy.jpg'));

        // test WITHOUT idCard
        form.append('documents', fs.createReadStream('dummy.pdf'));

        console.log("Submitting...");

        const res = await axios.post('http://localhost:5000/api/events', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log("SUCCESS:", res.data);
    } catch (error) {
        console.error("ERROR:", error.response?.data || error.message);
    } finally {
        if (fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
        if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
    }
}
testSubmit();

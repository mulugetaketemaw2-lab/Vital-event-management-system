const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
    const lr = await axios.post('http://localhost:5000/api/auth/login', { username: 'sekina', password: 'test1234' });
    const token = lr.data.token;
    const u = lr.data.data.user;
    console.log('User:', u.username, '| isActive:', u.isActive, '| role:', u.role);

    const f = new FormData();
    f.append('type', 'birth');
    f.append('location', JSON.stringify({ region: 'Addis Ababa', zone: 'Addis Ketema', woreda: 'Ammanuel Area', kebele: 'Amanuel kebele01' }));
    f.append('eventDate', '2024-01-01');
    f.append('childName', 'TestBaby' + Date.now());
    f.append('gender', 'male');
    f.append('placeOfBirth', 'Addis Hospital');
    f.append('fatherName', 'Test Father');
    f.append('motherName', 'Test Mother');

    fs.writeFileSync('t.jpg', 'x');
    fs.writeFileSync('t.pdf', 'x');
    f.append('childPhoto', fs.createReadStream('t.jpg'));
    f.append('fatherPhoto', fs.createReadStream('t.jpg'));
    f.append('motherPhoto', fs.createReadStream('t.jpg'));
    f.append('documents', fs.createReadStream('t.pdf'));

    try {
        const r = await axios.post('http://localhost:5000/api/events', f, {
            headers: { ...f.getHeaders(), Authorization: 'Bearer ' + token }
        });
        console.log('SUCCESS:', r.data.status);
    } catch (e) {
        console.error('ERROR:', JSON.stringify(e.response?.data));
    }
    fs.unlinkSync('t.jpg');
    fs.unlinkSync('t.pdf');
}
run();

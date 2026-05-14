const axios = require('axios');

async function login() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'national.rep',
            password: 'password123'
        });
        console.log("SUCCESS");
        console.log(res.data);
    } catch (error) {
        console.error("ERROR");
        console.error(error.response ? error.response.data : error.message);
    }
}

login();

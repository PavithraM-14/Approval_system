// Test the login API endpoint directly
const fetch = require('node-fetch');

async function testLoginAPI() {
  try {
    console.log('🧪 Testing login API at http://localhost:3000/api/auth/login');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@dmas.com',
        password: 'adminPassword123'
      })
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Check cookies
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      console.log('\n🍪 Cookies set:', cookies);
    } else {
      console.log('\n❌ No cookies set');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLoginAPI();

import axios from 'axios';

async function testPythonEndpoint() {
  const url = 'http://127.0.0.1:5000/api/python/recent-dub';
  console.log(`Testing Python endpoint: ${url}`);
  try {
    const startTime = Date.now();
    const { data } = await axios.get(url, { timeout: 15000 });
    const duration = Date.now() - startTime;
    
    console.log(`\nStatus: Success (${duration}ms)`);
    console.log(`Results Count: ${data.media?.length || 0}`);
    
    if (data.media && data.media.length > 0) {
      console.log("\nFirst 3 Results Sample:");
      data.media.slice(0, 3).forEach((m, i) => {
        console.log(`[${i+1}] ${m.title.romaji} (ID: ${m.id}) - EP: ${m.episodes}`);
      });
      console.log("\nFull structure of first result:");
      console.log(JSON.stringify(data.media[0], null, 2));
    } else {
      console.log("\nWarning: Endpoint returned 0 results.");
    }
  } catch (err) {
    console.error("\nError: Failed to connect to Python backend.");
    console.error(`Message: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.error("Suggestion: It seems the server on port 5000 is NOT running.");
    }
  }
}

testPythonEndpoint();

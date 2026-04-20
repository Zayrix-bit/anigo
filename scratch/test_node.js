import axios from 'axios';

async function testNodeEndpoint() {
  console.log("Testing Node.js endpoint: http://localhost:3001/api/recent-dub");
  try {
    const startTime = Date.now();
    const { data } = await axios.get('http://localhost:3001/api/recent-dub', { timeout: 10000 });
    const duration = Date.now() - startTime;
    
    console.log(`\nStatus: Success (${duration}ms)`);
    console.log(`Results Count: ${data.media?.length || 0}`);
    
    if (data.media && data.media.length > 0) {
      console.log("\nFirst Result Sample:");
      console.log(JSON.stringify(data.media[0], null, 2));
    } else {
      console.log("\nWarning: Endpoint returned 0 results.");
    }
  } catch (err) {
    console.error("\nError: Failed to connect to Node.js backend.");
    console.error(`Message: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.error("Suggestion: It seems the server on port 3001 is NOT running.");
    }
  }
}

testNodeEndpoint();

const { MongoClient } = require('mongodb');

// Test both the new URI and a basic connection
const newUri = "mongodb+srv://harsh:harsh160502@aipersonna.sjrta8m.mongodb.net/?retryWrites=true&w=majority&appName=AIpersonna";

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('URI:', newUri.replace(/harsh160502/, '***HIDDEN***'));
  
  const client = new MongoClient(newUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  });
  
  try {
    console.log('📡 Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database operations
    const database = client.db('aiPersona');
    console.log('🔍 Testing database access...');
    
    const collections = await database.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    // Test traits collection
    const traitsCollection = database.collection('traits');
    const traitCount = await traitsCollection.countDocuments();
    console.log(`📋 Traits in database: ${traitCount}`);
    
    // Show first trait if any exist
    if (traitCount > 0) {
      const firstTrait = await traitsCollection.findOne();
      console.log('📋 First trait:', firstTrait?.title || 'No title');
    }
    
    console.log('✅ All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  } finally {
    await client.close();
    console.log('🔐 Connection closed');
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log(success ? '🎉 Test completed successfully!' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }); 
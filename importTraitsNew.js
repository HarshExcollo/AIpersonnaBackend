require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection string
const uri = process.env.MONGO_URI;

// Parse the trait file with the new format
function parseTraitFile(content) {
  const traits = [];
  
  // Define the sections we want to extract
  const sectionPatterns = [
    { title: 'About', pattern: /About:(.*?)(?=\n\nCore Expertise:|$)/s },
    { title: 'Core Expertise', pattern: /Core Expertise:(.*?)(?=\n\nCommunication Style:|$)/s },
    { title: 'Communication Style', pattern: /Communication Style:(.*?)(?=\n\nTraits:|$)/s },
    { title: 'Traits', pattern: /Traits:(.*?)(?=\n\nPain Points:|$)/s },
    { title: 'Pain Points', pattern: /Pain Points:(.*?)(?=\n\nKey Responsibilities:|$)/s },
    { title: 'Key Responsibilities', pattern: /Key Responsibilities:(.*?)(?=$)/s }
  ];
  
  // Extract each section using regex
  for (const section of sectionPatterns) {
    const match = content.match(section.pattern);
    if (match && match[1]) {
      traits.push({
        title: section.title,
        category: section.title,
        description: match[1].trim()
      });
    }
  }
  
  return traits;
}

async function testConnection() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  });
  
  try {
    console.log('Testing MongoDB connection...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const database = client.db('aiPersona');
    const collections = await database.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  } finally {
    await client.close();
  }
}

async function importTraits() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  
  try {
    // Test connection first
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      console.log('Exiting due to connection failure.');
      return;
    }
    
    // Connect to MongoDB
    await client.connect();
    console.log('🔗 Connected to MongoDB for import');
    
    const database = client.db('aiPersona');
    const traitsCollection = database.collection('traits');
    
    // Read the trait file
    const traitFilePath = path.resolve(__dirname, '../frontend/trait');
    console.log('📖 Reading trait file from:', traitFilePath);
    
    if (!fs.existsSync(traitFilePath)) {
      console.error('❌ Trait file not found at:', traitFilePath);
      return;
    }
    
    const traitContent = fs.readFileSync(traitFilePath, 'utf8');
    console.log('📄 File content length:', traitContent.length);
    
    // Parse the trait file
    const traits = parseTraitFile(traitContent);
    console.log('🔄 Parsed traits:', traits.length);
    
    // Print each trait for verification
    traits.forEach((trait, index) => {
      console.log(`📋 Trait ${index + 1}: ${trait.title} (${trait.category})`);
      // Print first 100 characters of description
      console.log(`   Description: ${trait.description.substring(0, 100)}...`);
    });
    
    // Insert traits into MongoDB
    if (traits.length > 0) {
      // Delete existing traits first
      const deleteResult = await traitsCollection.deleteMany({});
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing traits`);
      
      // Insert new traits
      const result = await traitsCollection.insertMany(traits);
      console.log(`✅ ${result.insertedCount} traits imported successfully!`);
      
      // Verify the import
      const count = await traitsCollection.countDocuments();
      console.log(`✅ Verification: ${count} traits now in database`);
      
      // Show a sample trait
      const sampleTrait = await traitsCollection.findOne();
      if (sampleTrait) {
        console.log('📋 Sample trait in database:');
        console.log(`   Title: ${sampleTrait.title}`);
        console.log(`   Category: ${sampleTrait.category}`);
        console.log(`   Description (first 100 chars): ${sampleTrait.description.substring(0, 100)}...`);
      }
      
    } else {
      console.log('❌ No traits found to import');
    }
    
  } catch (error) {
    console.error('❌ Error importing traits:', error);
  } finally {
    await client.close();
    console.log('🔐 MongoDB connection closed');
  }
}

// Run the import
console.log('🚀 Starting trait import process...');
importTraits()
  .then(() => console.log('🎉 Import process completed!'))
  .catch(console.error); 
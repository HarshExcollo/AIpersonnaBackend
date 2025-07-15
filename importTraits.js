require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection string
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Parse the trait file
function parseTraitFile(content) {
  // Split the content by sections that start with a dash and trait category
  const traitRegex = /\s*-\s*(.*?)\s*\n\s*Trait Category:\s*(.*?)\s*\n\s*Trait Description:\s*(.*?)(?=\n\n\n\s*-\s*|\n\n\n\s*$|$)/gs;
  const matches = [...content.matchAll(traitRegex)];
  
  return matches.map(match => {
    return {
      title: match[1].trim(),
      category: match[2].trim(),
      description: match[3].trim()
    };
  });
}

// Special case for the role profile section which has a different format
function extractRoleProfile(content) {
  const roleProfileRegex = /\s*-\s*(Role Profile & Responsibilities:.*?)(?=\n\n\n\s*-\s*|\n\n\n\s*$|$)/gs;
  const match = roleProfileRegex.exec(content);
  
  if (match) {
    const fullText = match[1];
    const titleMatch = /Role Profile & Responsibilities:\s*(.*?)(?=\n|$)/.exec(fullText);
    const title = titleMatch ? titleMatch[1].trim() : "Role Profile & Responsibilities";
    
    return {
      title: "Role Profile & Responsibilities",
      category: "Role Profile",
      description: fullText.replace(/Role Profile & Responsibilities:.*?\n/, '').trim()
    };
  }
  
  return null;
}

async function importTraits() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('aiPersona');
    const traitsCollection = database.collection('traits');
    
    // Read the trait file - using absolute path
    const traitFilePath = path.resolve(__dirname, '../frontend/trait');
    console.log('Reading trait file from:', traitFilePath);
    const traitContent = fs.readFileSync(traitFilePath, 'utf8');
    console.log('File content length:', traitContent.length);
    
    // Parse the trait file
    const traits = parseTraitFile(traitContent);
    
    // Add the role profile if it exists
    const roleProfile = extractRoleProfile(traitContent);
    if (roleProfile) {
      traits.push(roleProfile);
    }
    
    console.log('Parsed traits:', traits.length);
    console.log('First trait:', JSON.stringify(traits[0], null, 2));
    
    // Insert traits into MongoDB
    if (traits.length > 0) {
      // Delete existing traits first
      await traitsCollection.deleteMany({});
      console.log('Deleted existing traits');
      
      // Insert new traits
      const result = await traitsCollection.insertMany(traits);
      console.log(`${result.insertedCount} traits imported successfully`);
    } else {
      console.log('No traits found to import');
    }
    
  } catch (error) {
    console.error('Error importing traits:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import
importTraits(); 
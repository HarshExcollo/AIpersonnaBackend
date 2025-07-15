require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection string
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Parse the trait file
function parseTraitFile(content) {
  const traitSections = content.split('\n\n\n').filter(section => section.trim());
  
  return traitSections.map(section => {
    const lines = section.trim().split('\n');
    
    // Extract title, category and description
    const titleLine = lines[0].trim();
    const categoryLine = lines[1].trim();
    const descriptionLines = lines.slice(2).join('\n').trim();
    
    // Parse title
    const title = titleLine.startsWith('-') ? titleLine.substring(1).trim() : titleLine.trim();
    
    // Parse category
    let category = '';
    if (categoryLine.startsWith('Trait Category:')) {
      category = categoryLine.replace('Trait Category:', '').trim();
    }
    
    // Parse description
    let description = '';
    if (descriptionLines.startsWith('Trait Description:')) {
      description = descriptionLines.replace('Trait Description:', '').trim();
    } else {
      description = descriptionLines;
    }
    
    return {
      title,
      category,
      description
    };
  });
}

async function importTraits() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('aiPersona');
    const traitsCollection = database.collection('traits');
    
    // Read the trait file
    const traitFilePath = path.join(__dirname, '../../frontend/trait');
    const traitContent = fs.readFileSync(traitFilePath, 'utf8');
    
    // Parse the trait file
    const traits = parseTraitFile(traitContent);
    
    // Insert traits into MongoDB
    if (traits.length > 0) {
      // Delete existing traits first
      await traitsCollection.deleteMany({});
      
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
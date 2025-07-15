const fs = require('fs');
const path = require('path');

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

function exportTraits() {
  try {
    // Read the trait file
    const traitFilePath = path.resolve(__dirname, '../frontend/trait');
    console.log('Reading trait file from:', traitFilePath);
    const traitContent = fs.readFileSync(traitFilePath, 'utf8');
    console.log('File content length:', traitContent.length);
    
    // Parse the trait file
    const traits = parseTraitFile(traitContent);
    console.log('Parsed traits:', traits.length);
    
    // Write to JSON file
    const outputPath = path.resolve(__dirname, '../traits.json');
    fs.writeFileSync(outputPath, JSON.stringify(traits, null, 2));
    console.log(`Exported ${traits.length} traits to ${outputPath}`);
    
    // Also print the first trait for verification
    if (traits.length > 0) {
      console.log('First trait:', JSON.stringify(traits[0], null, 2));
    }
  } catch (error) {
    console.error('Error exporting traits:', error);
  }
}

// Run the export
exportTraits(); 
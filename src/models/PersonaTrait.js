const mongoose = require('mongoose');

const personaTraitSchema = new mongoose.Schema({
  personaId: { type: String, required: true, unique: true },
  about: { type: String, required: true },
  coreExpertise: { type: [String], required: true },
  communicationStyle: { type: String, required: true },
  traits: { type: [String], required: true },
  painPoints: { type: [String], required: true },
  keyResponsibilities: { type: [String], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PersonaTrait', personaTraitSchema); 
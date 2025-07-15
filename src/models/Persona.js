const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  avatar: { type: String, required: true },
  hasStartChat: { type: Boolean, default: false },
  traits: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Persona', personaSchema); 
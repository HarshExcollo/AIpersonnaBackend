const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: { type: String, required: true },
  persona: { type: String, required: true }, // persona id or name
  session_id: { type: String, required: true }, // session id for grouping
  user_message: { type: String, required: true },
  ai_response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema); 
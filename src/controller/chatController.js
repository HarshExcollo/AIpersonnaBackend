const Chat = require('../models/Chat');

// Save a complete chat exchange (user message + AI response)
exports.saveMessage = async (req, res) => {
  try {
    console.log('req.user:', req.user); // Debug log
    const user = req.user && req.user.id ? req.user.id : undefined; // Always use the logged-in user's id
    const { persona, session_id, user_message, ai_response } = req.body;
    if (!user || !persona || !session_id || !user_message || !ai_response) {
      return res.status(400).json({ success: false, message: 'Missing required fields: user, persona, session_id, user_message, ai_response.' });
    }
    const chat = new Chat({ user, persona, session_id, user_message, ai_response });
    await chat.save();
    res.status(201).json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving chat message', error: error.message });
  }
};

// Get chat messages for a user and persona, optionally filtered by session_id
exports.getMessages = async (req, res) => {
  try {
    const user = req.user.id; // Always use the logged-in user's id
    const { persona, session_id } = req.query;
    console.log('getMessages called with:', { user, persona, session_id });
    
    if (!user || !persona) {
      console.log('Missing required parameters');
      return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
    }
    
    const filter = { user };
    if (persona && persona !== 'all') filter.persona = persona;
    if (session_id && session_id !== 'all') filter.session_id = session_id;
    
    console.log('MongoDB query filter:', JSON.stringify(filter, null, 2));
    
    const chats = await Chat.find(filter).sort({ timestamp: 1 });
    console.log('Found chats:', chats.length);
    console.log('Sample chat document:', chats.length > 0 ? chats[0] : 'No chats found');
    
    res.status(200).json({ success: true, chats });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ success: false, message: 'Error fetching chat messages', error: error.message });
  }
}; 












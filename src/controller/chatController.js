const Chat = require('../models/Chat');

// Save a complete chat exchange (user message + AI response)
exports.saveMessage = async (req, res) => {
  try {
    console.log('req.user:', req.user); // Debug log
    const user = req.user && req.user.id ? req.user.id : undefined; // Always use the logged-in user's id
    const { persona, session_id, user_message, ai_response, fileUrl, fileType } = req.body;
    if (!user || !persona || !session_id || !user_message || !ai_response) {
      return res.status(400).json({ success: false, message: 'Missing required fields: user, persona, session_id, user_message, ai_response.' });
    }
    const chat = new Chat({ user, persona, session_id, user_message, ai_response, fileUrl, fileType });
    await chat.save();
    res.status(201).json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving chat message', error: error.message });
  }
};

// Get chat messages for a user and persona, optionally filtered by session_id and archived status
exports.getMessages = async (req, res) => {
  try {
    const user = req.user.id; // Always use the logged-in user's id
    const { persona, session_id, archived } = req.query;
    console.log('getMessages called with:', { user, persona, session_id, archived });
    
    if (!user || !persona) {
      console.log('Missing required parameters');
      return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
    }
    
    const filter = { user };
    if (persona && persona !== 'all') filter.persona = persona;
    if (session_id && session_id !== 'all') filter.session_id = session_id;
    
    // Handle archived filtering
    if (archived !== undefined) {
      filter.archived = archived === 'true';
    }
    
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

// Archive a chat session (all messages in a session)
exports.archiveSession = async (req, res) => {
  try {
    const user = req.user.id;
    const { session_id } = req.body;
    
    if (!user || !session_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields: user, session_id.' });
    }
    
    const result = await Chat.updateMany(
      { user, session_id },
      { archived: true }
    );
    
    console.log(`Archived ${result.modifiedCount} messages for session ${session_id}`);
    
    res.status(200).json({ 
      success: true, 
      message: `Archived ${result.modifiedCount} messages`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error in archiveSession:', error);
    res.status(500).json({ success: false, message: 'Error archiving session', error: error.message });
  }
};

// Unarchive a chat session (all messages in a session)
exports.unarchiveSession = async (req, res) => {
  try {
    const user = req.user.id;
    const { session_id } = req.body;
    
    if (!user || !session_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields: user, session_id.' });
    }
    
    const result = await Chat.updateMany(
      { user, session_id },
      { archived: false }
    );
    
    console.log(`Unarchived ${result.modifiedCount} messages for session ${session_id}`);
    
    res.status(200).json({ 
      success: true, 
      message: `Unarchived ${result.modifiedCount} messages`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error in unarchiveSession:', error);
    res.status(500).json({ success: false, message: 'Error unarchiving session', error: error.message });
  }
}; 

// Get all chat messages for a user and persona, grouped by session_id
exports.getAllChatsForPersona = async (req, res) => {
  try {
    const user = req.user.id;
    const { persona } = req.query;
    if (!user || !persona) {
      return res.status(400).json({ success: false, message: 'Missing required query parameters: user, persona.' });
    }
    // Find all chats for this user and persona
    const chats = await Chat.find({ user, persona }).sort({ timestamp: 1 });
    // Group by session_id
    const sessions = {};
    chats.forEach(chat => {
      if (!sessions[chat.session_id]) sessions[chat.session_id] = [];
      sessions[chat.session_id].push(chat);
    });
    // Format as array of sessions
    const result = Object.entries(sessions).map(([session_id, messages]) => ({
      session_id,
      messages,
      date: messages[0]?.timestamp || null
    }));
    res.status(200).json({ success: true, sessions: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching all chats for persona', error: error.message });
  }
};

// Get recent chat sessions for a user, optionally filtered by persona
exports.getRecentChats = async (req, res) => {
  try {
    const user = req.user.id;
    const { limit = 5, persona } = req.query;
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Missing required query parameter: user.' });
    }

    // Build match filter
    const matchFilter = { 
      user: user,
      archived: { $ne: true } // Exclude archived chats
    };

    // Add persona filter if provided
    if (persona) {
      matchFilter.persona = persona;
    }

    // Use aggregation to get the most recent message from each session
    const recentChats = await Chat.aggregate([
      {
        $match: matchFilter
      },
      {
        $sort: { timestamp: 1 }
      },
      {
        $group: {
          _id: {
            session_id: "$session_id",
            persona: "$persona"
          },
          last_message: { $last: "$user_message" },
          last_ai_response: { $last: "$ai_response" },
          updated_at: { $last: "$timestamp" }
        }
      },
      {
        $sort: { updated_at: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get persona names for the results
    const mongoose = require('mongoose');
    const aiPersonnaDb = mongoose.connection.client.db('aiPersona');
    const personasCollection = aiPersonnaDb.collection('personas');
    
    // Format the results with persona names
    const formattedChats = await Promise.all(
      recentChats.map(async (chat) => {
        const personaData = await personasCollection.findOne({ id: chat._id.persona });
        return {
          session_id: chat._id.session_id,
          persona_id: chat._id.persona,
          persona_name: personaData ? personaData.name : 'Unknown Persona',
          last_message: chat.last_message || chat.last_ai_response || 'No message',
          updated_at: chat.updated_at
        };
      })
    );

    // Sort again by updated_at in descending order to ensure latest chats are first
    formattedChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    console.log('Recent chats sorted by timestamp (latest first):', formattedChats.map(chat => ({
      session_id: chat.session_id,
      updated_at: chat.updated_at,
      last_message: chat.last_message.substring(0, 30)
    })));

    res.status(200).json({ success: true, chats: formattedChats });
  } catch (error) {
    console.error('Error in getRecentChats:', error);
    res.status(500).json({ success: false, message: 'Error fetching recent chats', error: error.message });
  }
};

// Edit a chat message
exports.editMessage = async (req, res) => {
  try {
    const user = req.user.id;
    const { messageId, newText, newAIResponse } = req.body;
    
    if (!user || !messageId || !newText) {
      return res.status(400).json({ success: false, message: 'Missing required fields: messageId, newText.' });
    }
    
    // Find the chat message and verify it belongs to the user
    const chat = await Chat.findOne({ 
      _id: messageId,
      user: user
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Message not found or unauthorized.' });
    }
    
    // Update the user_message field
    chat.user_message = newText;
    if (newAIResponse !== undefined) {
      chat.ai_response = newAIResponse;
    }
    await chat.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Message updated successfully',
      chat: chat
    });
  } catch (error) {
    console.error('Error in editMessage:', error);
    res.status(500).json({ success: false, message: 'Error editing message', error: error.message });
  }
};
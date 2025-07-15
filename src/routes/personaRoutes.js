const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const chatController = require('../controller/chatController');
const Chat = require('../models/Chat');
const PersonaTrait = require('../models/PersonaTrait');
const authenticateJWT = require('../middleware/auth');

// Chat message routes - MUST come before /:id routes
router.post('/chats', authenticateJWT, chatController.saveMessage);
router.get('/chats', authenticateJWT, chatController.getMessages);

// Get all traits for a persona (uses direct collection access)
router.get('/traits', async (req, res) => {
  try {
    const database = mongoose.connection.db;
    const traitsCollection = database.collection('personatraits');
    const traits = await traitsCollection.find({}).toArray();
    res.status(200).json({ success: true, data: traits });
  } catch (error) {
    console.error('Error fetching traits:', error);
    res.status(500).json({ success: false, message: 'Error fetching traits', error: error.message });
  }
});

// Get all personas (uses direct collection access)
router.get('/', async (req, res) => {
  try {
    const database = mongoose.connection.db;
    const personasCollection = database.collection('personas');
    const personas = await personasCollection.find({}).toArray();
    res.status(200).json({ success: true, data: personas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching personas', error: error.message });
  }
});

// Store new persona data (uses direct collection access)
router.post('/store-persona', async (req, res) => {
  try {
    const database = mongoose.connection.db;
    const personasCollection = database.collection('personas');
    // Accept all persona fields
    const { id, name, role, department, avatar, hasStartChat, traits } = req.body;
    if (!id || !name || !role || !department || !avatar) {
      return res.status(400).json({ success: false, message: 'Missing required persona fields' });
    }
    const personaData = {
      id,
      name,
      role,
      department,
      avatar,
      hasStartChat: !!hasStartChat,
      traits: traits || [],
      updatedAt: new Date()
    };
    const result = await personasCollection.updateOne(
      { id },
      { $set: personaData },
      { upsert: true }
    );
    res.status(200).json({ 
      success: true, 
      message: result.upsertedCount ? 'Persona created successfully' : 'Persona updated successfully',
      data: personaData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error storing persona data', error: error.message });
  }
});

// Get a specific persona by ID (uses direct collection access)
router.get('/:id', async (req, res) => {
  try {
    const personaId = req.params.id;
    const database = mongoose.connection.db;
    const personasCollection = database.collection('personas');
    // Fetch persona from MongoDB
    let personaData = await personasCollection.findOne({ id: personaId });
    if (!personaData) {
      // If not found, return a default persona
      personaData = {
        id: personaId.toString(),
        name: "AI Persona",
        role: "Default Role",
        avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
        description: "Default persona description"
      };
    }
    // Always fetch traits from test.personatraits for any persona
    const testDb = mongoose.connection.client.db('test');
    const traitsCollection = testDb.collection('personatraits');
    // Fetch only the document for the requested personaId
    const doc = await traitsCollection.findOne({ personaId: req.params.id });
    let traits = [];
    if (doc) {
      if (doc.about) traits.push({ title: "About", description: doc.about });
      if (doc.coreExpertise) traits.push({ title: "Core Expertise", description: Array.isArray(doc.coreExpertise) ? doc.coreExpertise.join('\n') : doc.coreExpertise });
      if (doc.communicationStyle) traits.push({ title: "Communication Style", description: doc.communicationStyle });
      if (doc.traits) traits.push({ title: "Traits", description: Array.isArray(doc.traits) ? doc.traits.join('\n') : doc.traits });
      if (doc.painPoints) traits.push({ title: "Pain Points", description: Array.isArray(doc.painPoints) ? doc.painPoints.join('\n') : doc.painPoints });
      if (doc.keyResponsibilities) traits.push({ title: "Key Responsibilities", description: Array.isArray(doc.keyResponsibilities) ? doc.keyResponsibilities.join('\n') : doc.keyResponsibilities });
    }
    personaData.traits = traits;
    res.status(200).json({ success: true, data: personaData });
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({ success: false, message: 'Error fetching persona', error: error.message });
  }
});

// Get all chats for a user (uses Mongoose model)
router.get('/chats', async (req, res) => {
  try {
    const { user, persona, session_id } = req.query;
    let query = { user };
    if (persona && persona !== 'all') {
      query.persona = persona;
    }
    if (session_id) {
      query.session_id = session_id;
    }
    const chats = await Chat.find(query).sort({ timestamp: 1 });
    res.json({
      success: true,
      chats: chats
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chats'
    });
  }
});

// Store a new chat (uses Mongoose model)
router.post('/chats', async (req, res) => {
  try {
    const { user, persona, session_id, user_message, ai_response } = req.body;
    const newChat = new Chat({
      user,
      persona,
      session_id,
      user_message,
      ai_response
    });
    await newChat.save();
    res.json({
      success: true,
      message: 'Chat stored successfully'
    });
  } catch (error) {
    console.error('Error storing chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store chat'
    });
  }
});

// Get persona traits (uses Mongoose model)
router.get('/traits/:personaId', async (req, res) => {
  try {
    const { personaId } = req.params;
    const traits = await PersonaTrait.findOne({ personaId });
    if (!traits) {
      return res.status(404).json({
        success: false,
        error: 'Persona traits not found'
      });
    }
    res.json({
      success: true,
      traits: traits
    });
  } catch (error) {
    console.error('Error fetching persona traits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch persona traits'
    });
  }
});

// Get all persona traits (uses Mongoose model)
router.get('/traits', async (req, res) => {
  try {
    const traits = await PersonaTrait.find({});
    res.json({
      success: true,
      traits: traits
    });
  } catch (error) {
    console.error('Error fetching all persona traits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch persona traits'
    });
  }
});

module.exports = router; 
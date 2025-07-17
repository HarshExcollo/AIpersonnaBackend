const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const chatController = require('../controller/chatController');
const Chat = require('../models/Chat');
const PersonaTrait = require('../models/PersonaTrait');
const authenticateJWT = require('../middleware/auth');

// --- File upload setup ---
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    // Accept images and docs only
    if (/image|pdf|msword|vnd.openxmlformats-officedocument/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed!'));
    }
  }
});

router.post('/upload', authenticateJWT, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl, fileType: req.file.mimetype });
});

// Chat message routes - MUST come before /:id routes
router.post('/chats', authenticateJWT, chatController.saveMessage);
router.get('/chats', authenticateJWT, chatController.getMessages);
router.post('/chats/archive', authenticateJWT, chatController.archiveSession);
router.post('/chats/unarchive', authenticateJWT, chatController.unarchiveSession);
router.get('/chats/all', authenticateJWT, chatController.getAllChatsForPersona);
router.get('/chats/recent', authenticateJWT, chatController.getRecentChats);

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
    const aiPersonnaDb = mongoose.connection.client.db('aiPersona');
    const personasCollection = aiPersonnaDb.collection('personas');
    const personas = await personasCollection.find({}).toArray();
    res.status(200).json({ success: true, data: personas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching personas', error: error.message });
  }
});

// Store new persona data (uses direct collection access)
router.post('/store-persona', async (req, res) => {
  try {
    const aiPersonnaDb = mongoose.connection.client.db('aiPersonna');
    const personasCollection = aiPersonnaDb.collection('personas');
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
    const aiPersonnaDb = mongoose.connection.client.db('aiPersona');
    const personasCollection = aiPersonnaDb.collection('personas');
    // Fetch persona from MongoDB
    let personaData = await personasCollection.findOne({ id: personaId });
    if (!personaData) {
        personaData = {
          id: personaId.toString(),
          name: "AI Persona",
          role: "Default Role",
          avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
        description: "Default persona description",
        department: "",
        hasStartChat: false,
        traits: [],
        updatedAt: new Date()
      };
    }
    // Ensure avatar is always present
    if (!personaData.avatar) {
      personaData.avatar = "https://randomuser.me/api/portraits/lego/1.jpg";
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
    // Return all fields for consistency
    const { id, name, role, department, avatar, description, hasStartChat, traits: personaTraits, updatedAt } = personaData;
    res.status(200).json({ success: true, data: { id, name, role, department, avatar, description, hasStartChat, traits: personaTraits, updatedAt } });
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
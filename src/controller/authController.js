const User = require('../models/User');
const authService = require('../services/authService');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  try {
    console.log('Received registration body:', req.body); // Debug log
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }
    const newUser = new User({ username, email });
    newUser.setPassword(password);

    // Fallback: If passwordHash is still missing, hash it here
    if (!newUser.passwordHash && newUser._plainPassword) {
      const salt = await bcrypt.genSalt(10);
      newUser.passwordHash = await bcrypt.hash(newUser._plainPassword, salt);
    }

    await newUser.save();
    res.status(201).json({ message: "User registered successfully", userId: newUser.userId });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('Login attempt body:', req.body); // Log the login request body
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    const valid = await authService.comparePassword(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });
    const token = authService.generateJWT(user);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    if (err && err.stack) console.error(err.stack); // Log stack trace if available
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    // For simplicity, just respond with a message. Implement email reset link if needed.
    res.status(501).json({ error: 'Forgot password not implemented in normal auth mode.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // For simplicity, just respond with a message. Implement email reset link if needed.
    res.status(501).json({ error: 'Reset password not implemented in normal auth mode.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Get favorite personas for the current user
exports.getFavorites = async (req, res) => {
  try {
    console.log('Get favorites request:', { user: req.user });
    const userId = req.user.id;
    console.log('Looking for user with _id:', userId);
    const user = await User.findOne({ _id: userId });
    console.log('Found user:', user ? 'Yes' : 'No');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, favorites: user.favorites || [] });
  } catch (error) {
    console.error('Error in getFavorites:', error);
    res.status(500).json({ success: false, message: 'Error fetching favorites', error: error.message });
  }
};

// Toggle favorite persona for the current user
exports.toggleFavoritePersona = async (req, res) => {
  try {
    console.log('Toggle favorite request:', { user: req.user, body: req.body });
    const userId = req.user.id;
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ success: false, message: 'Missing personaId' });
    
    console.log('Looking for user with _id:', userId);
    const user = await User.findOne({ _id: userId });
    console.log('Found user:', user ? 'Yes' : 'No');
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const currentFavorites = user.favorites || [];
    const idx = currentFavorites.indexOf(personaId);
    let newFavorites;
    let action;
    
    if (idx === -1) {
      newFavorites = [...currentFavorites, personaId];
      action = 'added';
    } else {
      newFavorites = currentFavorites.filter(id => id !== personaId);
      action = 'removed';
    }
    
    // Use findByIdAndUpdate to avoid validation issues
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { favorites: newFavorites },
      { new: true, runValidators: false }
    );
    
    res.json({ success: true, favorites: updatedUser.favorites, action });
  } catch (error) {
    console.error('Error in toggleFavoritePersona:', error);
    res.status(500).json({ success: false, message: 'Error toggling favorite', error: error.message });
  }
}; 
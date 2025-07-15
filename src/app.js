require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const personaRoutes = require('./routes/personaRoutes');
const setupSwagger = require('./swagger');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Middleware (body parser, etc.)
app.use(express.json());

// Connect to MongoDB
mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/personas', personaRoutes);

// Swagger docs
setupSwagger(app);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app; 
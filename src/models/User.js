const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

console.log('User model loaded');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  userId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to set userId and hash password
userSchema.pre('save', async function(next) {
  if (!this.userId) {
    this.userId = this._id.toString();
  }
  console.log('Pre-save hook: _plainPassword =', this._plainPassword); // Debug log
  if (this._plainPassword) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this._plainPassword, salt);
    this._plainPassword = undefined;
  }
  next();
});

// Helper to set plain password
userSchema.methods.setPassword = function(password) {
  this._plainPassword = password;
};

module.exports = mongoose.model('User', userSchema); 
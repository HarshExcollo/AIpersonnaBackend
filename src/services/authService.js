const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');

exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

exports.comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

exports.generateJWT = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email
  };
  const secret = config.jwtSecret || 'your_jwt_secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}; 
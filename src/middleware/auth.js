const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, config.jwtSecret, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user; // user.id, user.username, etc.
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

module.exports = authenticateJWT; 
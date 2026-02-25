const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError } = require('./errors');

const signToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

const extractToken = (req) => {
  let token;
  
  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check cookies
  if (!token && req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  
  return token;
};

const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = signToken(payload);
  const refreshToken = signRefreshToken({ id: user._id });
  
  return { accessToken, refreshToken };
};

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
  extractToken,
  generateTokenPair,
};
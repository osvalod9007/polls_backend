const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../models/user.model');
const Role = require('../models/role.model');

const verifyToken = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    jwt.verify(token, config.get('jwtSecret'), (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token is not valid' });
      } else {
        req.user = decoded.user;
        next();
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);
    try {
      let roles = await Role.find({ _id: { $in: user.roles } });
      for (let i = 0; i < roles.length; i++) {
        if (roles[i].name === 'admin') {
          next();
          return;
        }
      }

      res.status(403).send({ msg: 'Require Admin Role!' });
      return;
    } catch (error) {
      res.status(500).send({ msg: error });
    }
  } catch (err) {
    res.status(500).send({ msg: err });
  }
};

const isPowerUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);
    try {
      let roles = await Role.find({ _id: { $in: user.roles } });
      for (let i = 0; i < roles.length; i++) {
        if (roles[i].name === 'power_user') {
          next();
          return;
        }
      }

      res.status(403).send({ msg: 'Require Power User Role!' });
      return;
    } catch (error) {
      res.status(500).send({ msg: error });
    }
  } catch (err) {
    res.status(500).send({ msg: err });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isPowerUser,
};
module.exports = authJwt;

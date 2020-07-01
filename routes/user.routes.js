const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const authJwt = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const normalize = require('normalize-url');

const User = require('../models/user.model');
const Role = require('../models/role.model');

const regExpPass = new RegExp(
  '^(?=.*[A-Za-z])(?=.*d)(?=.*[@$.!%*#?&])[A-Za-zd@$.!%*#?&]{8,}$'
);

// @route    GET api/users/all
// @desc     Get all users by token and is admin
// @access   Private
router.get('/all', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  '/',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('fullname', 'Full name es required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Password should not be empty, minimum eight characters, at least one letter, one number and one special character'
    ).isLength({ min: 8 }),
    // .matches(regExpPass),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, fullname, email, password, roles } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = await User.findOne({ username });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Username already exists' }] });
      }

      const avatar = normalize(
        gravatar.url(email, {
          s: '100',
          r: 'pg',
          d: 'mm',
        }),
        { forceHttps: true }
      );

      user = new User({
        username,
        fullname,
        email,
        avatar,
        password,
        roles,
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      let userRoles = [];
      if (roles) {
        userRoles = await Role.find({ name: { $in: roles } });
        user.roles = userRoles.map((role) => role._id);
      } else {
        userRoles = await Role.findOne({ name: 'user' });
        user.roles = [userRoles._id];
      }
      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;

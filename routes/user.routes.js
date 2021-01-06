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
const checkObjectId = require('../middleware/checkObjectId');

const regExpPass = new RegExp('^(?=.*[A-Za-z])(?=.*d)[A-Za-zd]{8,}$');

// @route    GET api/users/all
// @desc     Get all users by token and is admin
// @access   Private
router.get('/all', [authJwt.verifyToken], async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 });
    res.status(200).json(users);
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
      'Please enter a password at least 8 character and contain At least one uppercase.At least one lower case.At least one special character. '
    )
      .isLength({ min: 8 })
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d@$.!%*#?&]/),
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
      console.log(user.id);

      const payload = {
        user: {
          id: user._id,
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/users/addedit/
// @desc     Create or update user
// @access   Private
router.post(
  '/addedit',
  [
    authJwt.verifyToken,
    [
      check('username', 'Username is required').not().isEmpty(),
      check('fullname', 'Full name es required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check(
        'password',
        'Please enter a password at least 8 character and contain At least one uppercase.At least one lower case.At least one special character. '
      )
        .isLength({ min: 8 })
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d@$.!%*#?&]/),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { roles, username, fullname, email, password } = req.body;

    try {
      const role = await Role.findById(roles);

      const avatar = normalize(
        gravatar.url(email, {
          s: '100',
          r: 'pg',
          d: 'mm',
        }),
        { forceHttps: true }
      );

      const salt = await bcrypt.genSalt(10);

      const userFields = {
        username,
        fullname,
        email,
        password: await bcrypt.hash(password, salt),
        avatar,
        roles: [role._id],
      };

      // Using upsert option (creates new doc if no match is found):
      let user = await User.findOneAndUpdate(
        { username: username },
        { $set: userFields },
        { new: true, upsert: true }
      );
      // res.status(200).json({ msg: 'User save successfully' });
      res.status(200).json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    DELETE api/users
// @desc     Delete user
// @access   Private
router.delete(
  '/:id',
  [authJwt.verifyToken, checkObjectId('id')],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      // Check user exist
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Check user delete is not user token
      if (user._id.toString() === req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      await user.remove();
      res.status(200).json({ msg: 'User removed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;

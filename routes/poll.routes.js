const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authJwt = require('../middleware/auth');

const Poll = require('../models/poll.model');
const Choice = require('../models/choice.model');
const User = require('../models/user.model');
const checkObjectId = require('../middleware/checkObjectId');

// @route    POST api/polls
// @desc     Create a poll
// @access   Private
router.post(
  '/',
  [
    authJwt.verifyToken,
    [
      check('topic', 'Topic is required').not().isEmpty(),
      check('choices', 'Choices is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPoll = new Poll({
        topic: req.body.topic,
        author: user.fullname,
        user: req.user.id,
      });

      const pollSave = await newPoll.save();

      req.body.choices.map(async (choice) => {
        const newChoice = new Choice({
          poll: pollSave._id,
          value: choice.value,
        });
        await newChoice.save();
      });

      res.status(200).json({ msg: 'Poll was added successfully!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/polls
// @desc     Get all polls
// @access   Private
router.get('/', authJwt.verifyToken, async (req, res) => {
  try {
    const polls = await Poll.find({}, { __v: 0 }).sort({ date: -1 });
    if (polls.length !== 0) {
      for (let i = 0; i < polls.length; i++) {
        const choices = await Choice.find({ poll: polls[i]._id });
        let poll = polls[i];
        polls[i] = {
          _id: poll.id,
          topic: poll.topic,
          author: poll.author,
          use: poll.user,
          status: poll.status,
          date: poll.date,
          choices,
        };
      }
    }
    res.status(200).json(polls);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/polls/:id
// @desc     Get poll by ID
// @access   Private
router.get(
  '/:id',
  [authJwt.verifyToken, checkObjectId('id')],
  async (req, res) => {
    try {
      const poll = await Poll.findById(req.params.id);
      const choices = await Choice.find({ poll: poll._id });

      const pollChoices = {
        _id: poll._id,
        topic: poll.topic,
        author: poll.author,
        use: poll.user,
        status: poll.status,
        date: poll.date,
        choices: choices,
      };

      res.status(200).json(pollChoices);
    } catch (err) {
      console.error(err.message);

      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/polls/:id
// @desc     Delete a poll
// @access   Private
router.delete(
  '/:id',
  [authJwt.verifyToken, checkObjectId('id')],
  async (req, res) => {
    try {
      const poll = await Poll.findById(req.params.id);

      if (!poll) {
        return res.status(404).json({ msg: 'Poll not found' });
      }

      const choices = await Choice.find({ poll: poll._id });
      if (choices.length !== 0) {
        for (let i = 0; i < choices.length; i++) {
          await choices[i].remove();
        }
      }

      await poll.remove();

      res.status(200).json({ msg: 'Poll removed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/polls/vote/:id
// @desc     Vote a choice
// @access   Private
router.put(
  '/vote/:id',
  [authJwt.verifyToken, checkObjectId('id')],
  async (req, res) => {
    try {
      const choice = await Choice.findById(req.params.id);

      let choices = await Choice.find({ poll: choice.poll });

      // Check if status is open (in case false === open) and ( in case true === closed)
      const status = await Poll.findById(choice.poll).select('status');
      if (status.status) {
        return res.status(404).json({ msg: 'The Poll is closed' });
      }

      // Check if the poll has already been vote
      const temp = choices.filter((choice) =>
        choice.votes.some((vote) => vote.user.toString() === req.user.id)
      );
      let pollChoices = {};

      if (temp.length !== 0) {
        res.status(400).json({ msg: 'Poll already vote' });
        return;
      } else {
        choice.votes.unshift({ user: req.user.id });

        await choice.save();
        // Conform json for res
        const poll = await Poll.findById(choice.poll);
        choices = await Choice.find({ poll: choice.poll });

        pollChoices = {
          _id: poll._id,
          topic: poll.topic,
          author: poll.author,
          use: poll.user,
          date: poll.date,
          status: poll.status,
          choices: choices,
        };
      }

      return res.status(200).json(pollChoices);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/polls/:id
// @desc     Udate a poll
// @access   Private
router.put(
  '/',
  [
    authJwt.verifyToken,
    [
      check('topic', 'Topic is required').not().isEmpty(),
      check('choices', 'Choices is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { _id, topic, author, use, choices } = req.body;
    const newPoll = {
      topic,
      author,
      use,
    };

    try {
      const poll = await Poll.findOneAndUpdate(
        { topic: topic },
        { $set: newPoll },
        { new: true, upsert: true }
      );

      let choicesDbIdPoll = await Choice.find({ poll: _id });

      choicesDbIdPoll.map(async (choice) => await choice.remove());

      const test = choices.map(async (choice) => {
        const newChoice = new Choice({
          poll: choice.poll,
          value: choice.value,
        });
        await newChoice.save();
      });

      res.status(200).send({ msg: 'Poll was edited successfully!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/polls/status/:id
// @desc     Udate a satus of poll
// @access   Private
router.put(
  '/status/:id',
  [authJwt.verifyToken, checkObjectId('id')],
  async (req, res) => {
    try {
      console.log('body', req.body);
      //   const poll = await Poll.findById(req.params.id);
      //   console.log(poll);
      const newStatus = { status: req.body.status };
      console.log('status', newStatus);
      const poll = await Poll.findOneAndUpdate(
        { _id: req.params.id },
        { $set: newStatus },
        { new: true, upsert: true }
      );
      res.status(200).json({ msg: 'Status Change successfully!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;

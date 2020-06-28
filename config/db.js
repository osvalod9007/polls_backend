const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');
const Role = require('../models/role.model');

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected...');
    initial();
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

const initial = async () => {
  await Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: 'user',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log("added 'User' to roles collection");
      });

      new Role({
        name: 'power_user',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log("added 'Power User' to roles collection");
      });

      new Role({
        name: 'admin',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log("added 'Admin' to roles collection");
      });
    }
  });
};

module.exports = connectDB;

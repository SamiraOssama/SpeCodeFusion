const mongoose = require('mongoose');
const Repo = require('../models/repo');
const User = require('../models/user');

async function checkOwners() {
  try {
    await mongoose.connect('mongodb://localhost:27017/specodefusion', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const repos = await Repo.find().populate('owner', 'username email');
    
    console.log('\nRepository Owner Information:');
    console.log('============================');
    
    for (const repo of repos) {
      console.log(`\nRepo Name: ${repo.name}`);
      console.log(`Owner ID: ${repo.owner?._id || 'Not set'}`);
      console.log(`Owner Username: ${repo.owner?.username || 'Not set'}`);
      console.log(`Owner Email: ${repo.owner?.email || 'Not set'}`);
    }

    const users = await User.find();
    console.log('\nAll Users:');
    console.log('==========');
    for (const user of users) {
      console.log(`\nUser ID: ${user._id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOwners(); 
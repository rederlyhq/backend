import express = require('express');

const  router = express.Router();

router.use('/users', require('./features/users/user-route'));

module.exports = router;

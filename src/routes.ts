// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');

const  router = express.Router();

router.use('/users', require('./features/users/user-route'));

module.exports = router;

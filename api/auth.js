const { createAuth } = require('../dist/auth');
// Retain the pool and startup promise across warm serverless invocations.
const auth = createAuth();
module.exports = auth.handler;

const { createCoachHandler } = require('../dist/coach.js');

const handler = createCoachHandler({
  env: process.env,
  fetchImpl: globalThis.fetch
});

module.exports = async (req, res) => {
  return handler(req, res);
};
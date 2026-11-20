const { createCoachHandler } = require('../dist/coach.js');

const handler = createCoachHandler({
  env: { ...process.env, REQUIRE_PAID_COACH: 'true' },
  fetchImpl: globalThis.fetch
});

module.exports = async (req, res) => {
  return handler(req, res);
};
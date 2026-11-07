// Shared between the browser and Node tests. Every response has equal weight.
(function (root) {
  function score(values) {
    const valid = values.filter(v => Number.isInteger(v) && v >= 1 && v <= 5);
    return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length - 1) * 25) : null;
  }
  function sanitize(value) {
    const output = {};
    if (value && typeof value === 'object') for (let i = 0; i < 15; i++) {
      if (Number.isInteger(value[i]) && value[i] >= 1 && value[i] <= 5) output[i] = value[i];
    }
    return output;
  }
  const api = { score, sanitize };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LeadershipScoring = api;
})(typeof window !== 'undefined' ? window : globalThis);

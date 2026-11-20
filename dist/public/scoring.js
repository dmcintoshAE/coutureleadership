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
  function pillarScores(responses) {
    const clean = sanitize(responses);
    return ['Purpose','Precision','Presence','Tailoring','Craftsmanship'].map((name,i) => {
      const responses = [clean[i*3],clean[i*3+1],clean[i*3+2]];
      return {name, complete:responses.every(Number.isInteger), score:score(responses)};
    });
  }
  const api = { score, sanitize, pillarScores };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LeadershipScoring = api;
})(typeof window !== 'undefined' ? window : globalThis);

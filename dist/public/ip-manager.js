(() => {
  const STORAGE_KEY = 'couture-custom-ip-v1';

  function getActiveIP() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read custom IP from localStorage:', e);
    }
    return null;
  }

  function exportTemplate() {
    const defaultTemplate = {
      "$schema": "https://coutureleadership.com/schemas/ip-curation-v1.json",
      "version": "1.0.0",
      "title": "Couture Leadership™ Intellectual Property Template",
      "author": "Tiffany",
      "modules": {
        "dimensions": [
          { "id": "purpose", "name": "Purpose", "tagline": "Direction & Intent", "questions": ["Question 1", "Question 2", "Question 3"] },
          { "id": "precision", "name": "Precision", "tagline": "Rigor & Execution", "questions": ["Question 1", "Question 2", "Question 3"] },
          { "id": "presence", "name": "Presence", "tagline": "Gravitas & Trust", "questions": ["Question 1", "Question 2", "Question 3"] },
          { "id": "tailoring", "name": "Tailoring", "tagline": "Contextual Leadership", "questions": ["Question 1", "Question 2", "Question 3"] },
          { "id": "craftsmanship", "name": "Craftsmanship", "tagline": "Excellence & Mastery", "questions": ["Question 1", "Question 2", "Question 3"] }
        ],
        "coachPersona": {
          "tone": "Direct, incisive, Socratic, executive-level",
          "rubrics": ["Gravitas under pressure", "Strategic alignment", "Fiduciary accountability"]
        }
      }
    };
    const active = getActiveIP() || defaultTemplate;
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Couture_Leadership_IP_Template.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function validateAndImport(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error('Invalid JSON format.');
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Template root must be an object.');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return true;
  }

  function resetDefaults() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.IPManager = { getActiveIP, exportTemplate, validateAndImport, resetDefaults };
})();
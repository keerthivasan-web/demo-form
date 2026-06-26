/**
 * docnum.js - Unique Document Number Generator Library
 * Created for CVE&WD Drivers Personal Data Sheet Form
 */

const DocNum = (() => {
  const STORAGE_KEY_COUNTER = 'cvewd_docnum_counter';
  const STORAGE_KEY_CURRENT = 'cvewd_docnum_current';
  const STORAGE_KEY_LOG = 'cvewd_docnum_log';
  const PREFIX = 'CVEWD';

  // Central Google Apps Script Web App URL for deployment database sync
  const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzLdL-QUVhWvjxnNYd4ROa54y1s4iUUZO_JLDtJHtEHNe7IYan1_tmj4OPe_t7KQ5cP/exec'; 

  // Helper: Get padded sequence number
  function getNextSequence() {
    let counter = parseInt(localStorage.getItem(STORAGE_KEY_COUNTER), 10) || 0;
    counter += 1;
    localStorage.setItem(STORAGE_KEY_COUNTER, counter);
    return String(counter).padStart(4, '0');
  }

  // Helper: Get YYMMDD date string
  function getFormattedDate() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  // Helper: Generate a short random alphanumeric string (4 chars)
  function getRandomString() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate a brand new base ID: CVEWD-YYMMDD-NNNN-RRRR (local fallback)
  function generateNewBase() {
    const dateStr = getFormattedDate();
    const seqStr = getNextSequence();
    const randStr = getRandomString();
    const baseId = `${PREFIX}-${dateStr}-${seqStr}-${randStr}`;
    localStorage.setItem(STORAGE_KEY_CURRENT, baseId);
    return baseId;
  }

  // Background logging helper
  function logToApi(docId, baseId, type, name) {
    if (!API_ENDPOINT) return;
    const url = `${API_ENDPOINT}?action=log&docId=${encodeURIComponent(docId)}&baseId=${encodeURIComponent(baseId)}&type=${encodeURIComponent(type)}&name=${encodeURIComponent(name || '')}`;
    fetch(url).catch(err => console.warn('Failed to log document centrally:', err));
  }

  return {
    // Expose API endpoint details
    getApiEndpoint() {
      return API_ENDPOINT;
    },

    /**
     * Retrieves the current base document ID, or generates a new one if none exists.
     * @returns {string} The base document number.
     */
    getOrGenerateCurrentBase() {
      let current = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (!current) {
        current = generateNewBase();
      }
      return current;
    },

    /**
     * Forces the creation of a new base document ID.
     * @returns {string} The new base document number.
     */
    generateNewBase() {
      return generateNewBase();
    },

    /**
     * Asynchronously syncs the next base ID from the centralized database API.
     * Triggers the callback with the updated/synchronized ID.
     * @param {function} callback 
     */
    syncNextId(callback) {
      if (!API_ENDPOINT) {
        if (callback) callback(this.getOrGenerateCurrentBase());
        return;
      }

      fetch(`${API_ENDPOINT}?action=next`)
        .then(res => res.json())
        .then(data => {
          if (data && data.sequence) {
            const dateStr = getFormattedDate();
            const randStr = getRandomString();
            const syncedBaseId = `${PREFIX}-${dateStr}-${data.sequence}-${randStr}`;
            localStorage.setItem(STORAGE_KEY_CURRENT, syncedBaseId);
            if (callback) callback(syncedBaseId);
          } else {
            if (callback) callback(this.getOrGenerateCurrentBase());
          }
        })
        .catch(err => {
          console.warn('Central database offline or configuration error. Falling back to local ID:', err);
          if (callback) callback(this.getOrGenerateCurrentBase());
        });
    },

    /**
     * Gets the soft copy document ID (appends -S).
     * @returns {string}
     */
    getSoftCopyId(baseId) {
      const base = baseId || this.getOrGenerateCurrentBase();
      return `${base}-S`;
    },

    /**
     * Gets the hard copy document ID (appends -H).
     * @returns {string}
     */
    getHardCopyId(baseId) {
      const base = baseId || this.getOrGenerateCurrentBase();
      return `${base}-H`;
    },

    /**
     * Log a generated document action to history.
     * @param {string} applicantName Name of the applicant.
     * @param {'soft_copy' | 'hard_copy'} type Suffix/Action type.
     */
    logDocument(applicantName, type) {
      const baseId = this.getOrGenerateCurrentBase();
      const docId = type === 'hard_copy' ? this.getHardCopyId(baseId) : this.getSoftCopyId(baseId);
      
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOG)) || [];
      
      // Prevent duplicate logging of the same action for the same ID locally
      const exists = logs.some(log => log.docId === docId && log.applicantName === applicantName);
      if (exists) return;

      logs.push({
        docId,
        baseId,
        type,
        applicantName: applicantName || 'Unknown',
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(logs));

      // Centralized API logging
      logToApi(docId, baseId, type, applicantName);
    },

    /**
     * Retrieve all logged document IDs.
     * @returns {Array}
     */
    getLogs() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_LOG)) || [];
    }
  };
})();

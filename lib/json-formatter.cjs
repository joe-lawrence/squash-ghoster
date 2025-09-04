/**
 * JSON Formatter Utility
 * 
 * Provides consistent JSON formatting with sorted keys, similar to `jq .` output.
 * This makes visual inspection and testing much easier by ensuring consistent ordering.
 */

/**
 * Sorts object keys in a consistent order for better readability.
 * This function recursively sorts all object keys in the JSON structure.
 * 
 * @param {any} obj - The object to sort keys for
 * @returns {any} - The object with sorted keys
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sortedObj = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys(obj[key]);
  }
  
  return sortedObj;
}

/**
 * Formats JSON with consistent key ordering and proper indentation.
 * Similar to `jq .` output but without requiring the jq tool.
 * 
 * @param {any} data - The data to format
 * @param {number} space - Number of spaces for indentation (default: 2)
 * @returns {string} - Formatted JSON string
 */
function formatJSON(data, space = 2) {
  const sortedData = sortObjectKeys(data);
  let jsonString = JSON.stringify(sortedData, null, space);
  
  // Post-process the JSON to ensure float values show decimal points
  // Keep this limited to fields that are always floats to avoid altering integer-only fields
  jsonString = jsonString.replace(/"speechRate": (\d+)(?!\.)/g, '"speechRate": $1.0');
  jsonString = jsonString.replace(/"interval": (\d+)(?!\.)/g, '"interval": $1.0');
  jsonString = jsonString.replace(/"shotAnnouncementLeadTime": (\d+)(?!\.)/g, '"shotAnnouncementLeadTime": $1.0');
  
  return jsonString;
}

/**
 * Formats a workout JSON object with consistent ordering.
 * This is the main function to use for workout data.
 * 
 * @param {Object} workoutData - The workout data to format
 * @returns {string} - Formatted JSON string
 */
function formatWorkoutJSON(workoutData) {
  return formatJSON(workoutData, 2);
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  // Browser environment
  window.JSONFormatter = {
    sortObjectKeys,
    formatJSON,
    formatWorkoutJSON
  };
}

// Node.js CommonJS environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sortObjectKeys,
    formatJSON,
    formatWorkoutJSON
  };
} 
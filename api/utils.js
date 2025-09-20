// utils.js
import util from "util";

/**
 * Logs detailed information about items.
 * @param {Array} items - Array of items to log.
 */
export function logItems(items) {
  if (Array.isArray(items)) {
    items.forEach((item, idx) => {
      console.log(`\nItem #${idx}:`);
      console.log(util.inspect(item, { depth: null, colors: true }));
    });
  } else {
    console.log("items est absent ou n'est pas un tableau");
  }
}

/**
 * Detects if a specific item exists in the list.
 * @param {Array} items - Array of items to search.
 * @param {string} name - Name of the item to match.
 * @returns {boolean} - True if a match is found, false otherwise.
 */
export function detectItem(items, name) {
  return items?.some((item) => item?.name?.trim() === name);
}
// Initialize the sheet accessor
const sheet = SpreadsheetApp.getActiveSpreadsheet();

// Utility
function avg(arr) {
  return arr.reduce((acc, val) => acc + val, 0) / arr.length;
}
/**
 * Finds the point value of the value from header's values list
 * @param {string} header The header to look for
 * @param {string} val The value to find
 * @returns {number} The point value (-1 if not found)
 */
function mapToNum(header, val) {
  // Contains a map of each val
  const headerMap = new Map()
  // Get max columns
  const maxCol = sheet.getSheetByName('Value Map').getMaxColumns()+64;
  // Get the mapping sheet's data
  const headers = sheet.getRange(`'Value Map'!A1:${String.fromCharCode(maxCol)}1`)
    .getValues()
    .filter((v) => v !== "");
  // For each entry, create a new entry in the map
  headers.forEach((h) => headerMap.set(h, new Map()));
  // Get the values from the map
  const data = sheet.getRange(`'Value Map'!A2:${String.fromCharCode(maxCol)}`)
    .getValues();
  // Create a reduction function
  const reduceArray = inputArray => Array.from({ length: inputArray.length / 2 }, (_, i) => [inputArray[i * 2], inputArray[i * 2 + 1]]);
  // Create an array to hold the reduced arrays
  const arrs = [];
  // For each row, reduce it
  for(row of data) {
    // [k1,v1,k2,v2] => [[k1,v1],[k2,v2]]
    arrs.push(reduceArray(row));
  }
  // For each header
  for(const i = 0; i < headers.length; i++) {
    const m = new Map();
    // Find the map values using the index
    const vals = arrs
      .map((v) => v[i]);
    // For each value in this set, map it
    vals.forEach(([k, v]) => m.set(k, v));
  }
  // Find the val
  const h = headerMap.get(header);
  // Return data
  if(!h) return -1;
  return h.get(val);
}
// Add a manual trigger to calculate team data
function onOpen() {
  SpreadsheetApp
    .getUi()
    .createAddonMenu()
    .addItem("Calculate Team Data", "calcTeamData")
    .addToUi();
}
function onEdit(e) {
  var oldValue;
  var newValue;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeCell = ss.getActiveCell();
  if(activeCell.getColumn() == 3 && ss.getActiveSheet().getName()=="Match Scouting Responses") {
    newValue=e.value;
    oldValue=e.oldValue;
    if(!e.value) {
      activeCell.setValue("");
    } else {
      if (!e.oldValue) {
        activeCell.setValue(newValue);
      } else {
        if(oldValue.indexOf(newValue) <0) {
          activeCell.setValue(oldValue+','+newValue);
        } else {
          activeCell.setValue(oldValue);
        }
      }
    }
  }
  // calcTeamData() // DO NOT UNCOMMENT THIS!
  // THE FUNCTION IS NOT READY ~ Octavio
}

function calcTeamData() {
  // We'll use this later to store team data
  const teamData = new Map();
  // Prevent concurrent run sessions using Script Lock
  const scriptLock = LockService.getScriptLock();
  try {
    scriptLock.waitLock(30 * 1000);
  } catch(e) {
    Logger.log('A lock was unable to be acquired within the requested time frame');
    return;
  }
  // Since A is 65 and 1 column would return 1, add 64 to return the charCode
  const resLen = sheet.getSheetByName("Scouting Responses").getMaxColumns()+64
  // Get the sheet's data and use resLen to get all the data dynamically
  Logger.log(`A2:${String.fromCharCode(resLen)}`);
  const responses = sheet.getRange(`A2:${String.fromCharCode(resLen)}`).getValues();
  // Get the list of teams
  const teams = sheet.getRange('Calculations!A2:A').getValues()
    // Convert to number
    .map((t) => Number(t))
    // Filter out bad data
    .filter((t) => !isNaN(t) && t !== 0);
  // For each team...
  for(const team of teams) {
    // Find all responses where the team is valid
    const d = responses
      // Filter by team number
      .filter((r) => r[2] === team)
    // Check if the map has the data
    teamData.has(team)
      // Append the data to the existing array
      ? teamData.set(team, teamData.get(team).push(d))
      // Create a new array and push to the data
      : teamData.set(team, [d]);
    // Debugging message
    Logger.log(`[TD] Updated ${team}'s stored team data. The new value is ${teamData.get(team)}`);
  }
  // Get the value that occurs the most
}
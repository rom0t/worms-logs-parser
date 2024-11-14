import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import * as readline from 'readline';
import * as iconv from 'iconv-lite';
import { initializeDatabase } from './dbInitializer';
import { debug } from 'console';

// Your Worms Directory where the logs are extracted
const logsDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/';

// Path to the log file for games that ended unexpectedly
const unexpectedEndLogPath = path.join(logsDirectory, 'unexpected_end_games.log');

// Set up SQLite connection
const db = new sqlite3.Database('./worms_stats_db.sqlite');

const debugFlag = false;
const targetDate: string = ""; // Set as "2024-10-31" for debugging files on a specific day/hour or leave blank to process all logs
 


const playerAliasMap: { [alias: string]: string } = {};

//const playerAliasRegex = /([A-Za-z]+):\s"([^"]+)"\sas\s"([^"]+)"/;
const playerAliasRegex = /(.+):\s"([^"]+)"\sas\s"([^"]+)"/;
const OnlinePlayerRegex=/.+?"(.+?)"\s+as\s+"(.+?)"/
const OfflineAliasRegex= /\"(.+)\"/
const timeLoggingRegEx = /Game Started at (.+) GMT/;
const playerOnlineStartTurnRegEx = /\]\s...\s(.+)\s\((.*?)\)\s+starts turn/;
const playerOfflineStartTurnRegEx = /\]\s...\s(.*)\s+starts turn/;
const resultRegex = /(.+) gewinnt.+|Die Runde endete unentschieden/;
const onlineDamageRegex = /(\d+)\s(?:\(\d+\skills?\)\s*to|to)\s(.+)\s\((.*?)\)/;
const offlineDamageRegex = /(\d+)\s(?:\(\d+\s+kills?\)\s*to|to)\s+(.+)/;
const timeMatchRegEx = /\[([0-9:.]+)\]/;
// Updated regex to capture both "ends turn" and "loses turn due to loss of control"
const endTurnRegEx = /\[([\d:.]+)\]\s+•••\s(.+?)\s(?:ends turn|loses turn due to loss of control); time used: ([\d.]+) sec turn, ([\d.]+) sec retreat/;


let processedCount = 0;
let addedCount = 0;
let failedCount = 0;

interface PlayerAliasRow {
  player_id: number;
  alias: string;
  name: string;
}

interface WeaponRow {
  id: number;
}

interface PlayerRow {
  id: number;
  name: string;
}

interface PlayerNameRow {
  name: string;
}

// Function to initialize player alias mapping from the database
async function initializePlayerAliasMappingFromDb() {
  return new Promise<void>((resolve, reject) => {
    db.all("SELECT alias, name FROM player_aliases JOIN players ON player_aliases.player_id = players.id", [], (err, rows: PlayerAliasRow[]) => {
      if (err) {
        return reject(err);
      }
      rows.forEach((row) => {
        playerAliasMap[row.alias] = row.name; // Prepopulate playerAliasMap
      });
      resolve();
    });
  });
}

// Function to get the "No Weapon" ID with detailed debug output
async function getNoWeaponId(): Promise<number> {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM weapons WHERE name = ?', ['No Weapon'], (err, row: { id: number } | undefined) => {
            if (err) return reject(err);
            if (row) {
                console.log(`"No Weapon" ID found: ${row.id}`);
                resolve(row.id);
            } else {
                // Insert "No Weapon" entry if it doesn't exist
                db.run('INSERT INTO weapons (name) VALUES (?)', ['No Weapon'], function (err) {
                    if (err) return reject(err);
                    console.log(`"No Weapon" inserted with ID: ${this.lastID}`);
                    resolve(this.lastID);
                });
            }
        });
    });
}

// Database check function for existing alias mapping
async function findPlayerForAlias(alias: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT p.name FROM players p JOIN player_aliases pa ON p.id = pa.player_id WHERE pa.alias = ?', [alias], (err, row: PlayerNameRow | undefined) => {
      if (err) return reject(err);
      resolve(row ? row.name : null);
    });
  });
}

// Function to initialize player and alias mapping from the log lines
async function initializePlayerAliasMapping(lines: string[], isOnlineGame: boolean) {
    for (const line of lines) {
        // Use appropriate regex based on the game type
        const match = line.match(isOnlineGame ? OnlinePlayerRegex : OfflineAliasRegex);

        if (match) {
            const alias = match[1]?.trim(); // Safely access match[1]
            let playerName = isOnlineGame ? match[2]?.trim() : undefined; // Only use match[2] in online games

            if (!alias) {
                console.error("Alias could not be determined from the line:", line);
                continue; // Skip this line if alias is undefined
            }

            if (!isOnlineGame) {
                // For offline games, try to get player name from the database or ask for input
                const dbPlayerName = await findPlayerForAlias(alias);
                if (dbPlayerName) {
                    playerAliasMap[alias] = dbPlayerName;
                } else if (!playerAliasMap[alias]) {
                    // Ask for mapping if alias is unknown
                    playerName = await askForMapping(alias);
                    playerAliasMap[alias] = playerName;
                }
            } else if (playerName) {
                // For online games, use the player name from the log if available
                playerAliasMap[alias] = playerName;
            } else {
                console.error("Player name is missing for online game alias:", alias);
            }

            if (debugFlag) console.log(`Mapped alias: ${alias} to player: ${playerName || playerAliasMap[alias]}`);
        } else {
            if (debugFlag) console.warn("No match found for line:", line);
        }

        // Stop at gameplay lines
        if (line.includes('•••')) {
            break;
        }
    }
}

// Function to prompt for player mapping if alias is unknown
async function askForMapping(alias: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`Alias ${alias} is not mapped to a player. Please provide the player name for this alias: `, (playerName) => {
      rl.close();
      resolve(playerName);
    });
  });
}

// Function to find or insert a player into the database
async function findOrInsertPlayer(gameId: number, playerName: string | null, alias: string, isOnlineGame: boolean): Promise<number> {
  if (isOnlineGame && !playerName) {
    throw new Error('Player name is required for online games.');
  }

  return new Promise((resolve, reject) => {
    db.get('SELECT pa.player_id FROM player_aliases pa WHERE alias = ?', [alias], async (err, row: { player_id: number } | undefined) => {
        if (err) return reject(err);

        if (row && row.player_id) {
            resolve(row.player_id); // Alias already exists, return player_id
        } else {
            // Check if alias has a player name from playerAliasMap or manually mapped
            playerName = playerAliasMap[alias] || playerName || await askForMapping(alias);

            db.get('SELECT id FROM players WHERE name = ?', [playerName], (err, playerRow: PlayerRow | undefined) => {
                if (err) return reject(err);

                let playerId = playerRow?.id;
                if (playerId !== undefined) { // Ensure playerId is defined
                    // Player exists, insert alias mapping
                    db.run('INSERT INTO player_aliases (player_id, alias) VALUES (?, ?)', [playerId, alias], (err) => {
                        if (err) return reject(err);
                        resolve(playerId!); // Use "!" to assert that playerId is a number here
                    });
                } else {
                    // Insert new player and alias
                    db.run('INSERT INTO players (name) VALUES (?)', [playerName], function (err) {
                        if (err) return reject(err);
                        playerId = this.lastID;

                        // Ensure playerId is defined before resolving
                        db.run('INSERT INTO player_aliases (player_id, alias) VALUES (?, ?)', [playerId, alias], (err) => {
                            if (err) return reject(err);
                            resolve(playerId!); // Use "!" to assert that playerId is a number here
                        });
                    });
                }
            });
        }
    });
  });

}

// Function to handle "Sudden Death" by setting a sequential turn number
async function processSuddenDeath(dbGameId: number, playerIds: number[]) {
    console.log("Processing 'Sudden Death' event for all players involved in the game");

    // Get the latest turn number in this game to determine the next sequential turn number
    const lastTurnNumber = await new Promise<number>((resolve, reject) => {
        db.get(
            'SELECT MAX(turn_number) as lastTurnNumber FROM turns WHERE game_id = ?',
            [dbGameId],
            (err, row) => {
                if (err) {
                    console.error("Error retrieving last turn number:", err.message);
                    return reject(err);
                }
                resolve((row as { lastTurnNumber: number }).lastTurnNumber || 0); // If no turns exist yet, start from 0
            }
        );
    });

    const suddenDeathTurnNumber = lastTurnNumber + 1; // Increment the turn number for "Sudden Death"

    for (const playerId of playerIds) {
        // Insert "Sudden Death" as a new turn with the sequential turn number
        try {
            await new Promise<void>((resolve, reject) => {
                db.run(
                    'INSERT INTO turns (game_id, player_id, turn_number, reason) VALUES (?, ?, ?, ?)',
                    [dbGameId, playerId, suddenDeathTurnNumber, 'Sudden Death'],
                    function (err) {
                        if (err) {
                            console.error("Error inserting Sudden Death turn:", err.message);
                            return reject(err);
                        }
                        console.log(`Inserted 'Sudden Death' event for player ID: ${playerId} with turn number: ${suddenDeathTurnNumber}`);
                        resolve();
                    }
                );
            });
        } catch (error) {
            console.error(`Error processing Sudden Death for player ID ${playerId}:`, (error as Error).message);
            throw error;  // Rethrow to trigger rollback if needed
        }
    }
}


// Function to parse game metadata from the log
function parseLogMetadata(logContent: string): { gameId: string, gameDate: string, engineVersion: string } {
  const gameDateMatch = logContent.match(/Game Started at (.+) GMT/);
  const gameDate = gameDateMatch ? gameDateMatch[1] : 'Unknown Date';

  const engineVersionMatch = logContent.match(/Game Engine Version: (.+)/);
  const engineVersion = engineVersionMatch ? engineVersionMatch[1] : 'Unknown Version';

  const gameId = `offline_${gameDate.replace(/[- :]/g, '')}`;

  return { gameId, gameDate, engineVersion };
}

// Function to check if a log file has already been processed
function isFileProcessed(logFileName: string): Promise<boolean> {
    

  return new Promise((resolve, reject) => {
    db.get('SELECT log_file_name FROM games WHERE log_file_name = ?', [logFileName], (err, row) => {
      if (err) return reject(err);
      resolve(!!row); // Returns true if the file is already processed
    });
  });
}


async function parseAndUploadLog(filePath: string) {
  // Initialize the playerAliasMap with known items from the database
  await initializePlayerAliasMappingFromDb();

  const logContentBuffer = fs.readFileSync(filePath);
  const logContent = iconv.decode(logContentBuffer, 'windows-1252');

  // Reset variables for each new file
  let lines = logContent.split('\n');
  let logFileName = path.basename(filePath);
  let isOnlineGame = logFileName.includes('Online');
  let gameType = isOnlineGame ? 'Online' : 'Offline';
  let currentTurnPlayerId: number | undefined = undefined;
  let currentWeaponId: number | undefined = undefined;
  let turnStartTime: number | undefined = undefined;
  let turnId: number | undefined = undefined;
        
  let transactionStarted = false;
  let isUnexpectedEnd = false;
  let hasChecksumError = false;



  console.log(`Processing log file: ${logFileName}, Game Type: ${gameType}`);

    // Rollback any open transaction to avoid conflict at the start
    try {
        await new Promise<void>((resolve) => {
            db.run('ROLLBACK', (err) => {
                if (err && !err.message.includes('no transaction is active')) {
                    console.error("Error while rolling back any previous open transactions:", err.message);
                } else {
                    if (debugFlag) console.log("No active transaction to rollback.");
                }
                resolve();
            });
        });
    } catch (rollbackError) {
        console.error("Unexpected error during rollback:", (rollbackError as Error).message);
    }

    // Check if the file has already been processed
    const alreadyProcessed = await isFileProcessed(logFileName);
    if (alreadyProcessed) {
        console.warn(`Log file ${logFileName} has already been processed. Skipping...`);
        return;
    }
    console.log(`Log file ${logFileName} starts with being processed.`);

    try {
        // Start transaction
        await new Promise<void>((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(new Error("A transaction is already in progress."));
                transactionStarted = true;
                resolve();
            });
        });

        // Insert game details
        const gameDateMatch = logContent.match(timeLoggingRegEx);
        const gameDate = gameDateMatch ? gameDateMatch[1] : 'Unknown Date';
        const dbGameId = await new Promise<number>((resolve, reject) => {
            db.run(
                'INSERT INTO games (game_date, game_type, log_file_name) VALUES (?, ?, ?)',
                [gameDate, gameType, logFileName],
                function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });

        await initializePlayerAliasMapping(lines, isOnlineGame);

        let fileHasIssue = false;

for (const line of lines) {
    if (debugFlag) console.log(`Processing line: ${line}`);
    // Check for unexpected game end due to quitting
    if (line.includes("is quitting") || line.includes("disconnecting") || line.includes("Game Ends - User Quit")) {
        isUnexpectedEnd = true;
        if (debugFlag) console.warn(`Unexpected game end detected in file: ${filePath}`);
    }

    // Check for checksum errors
    if (line.includes('Checksum')) {
        console.error(`ISSUE WITH THIS LOG FILE, TRY NEW EXTRACT: ${logFileName}`);
        fileHasIssue = true;
        hasChecksumError = true;
        break;  // Stop further processing for this file
    }
    else if (line.includes("Sudden Death")) {
        console.log(`Processing 'Sudden Death' event for line: ${line}`);
        
        // Get all player IDs involved in this game
        const playerIds = Object.values(playerAliasMap).map(name => {
            const playerId = findOrInsertPlayer(dbGameId, name, name, isOnlineGame);
            return playerId;
        });
        
        // Process Sudden Death for all players with the sequential turn number
        await processSuddenDeath(dbGameId, await Promise.all(playerIds));
    }
    // Process start of turn
    else if (line.includes('starts turn')) {
        if (debugFlag) console.log(`Processing 'starts turn' for line: ${line}`);
        const timeMatch = line.match(timeMatchRegEx);
        if (timeMatch) {
            const timeParts = timeMatch[1].split(':');
            turnStartTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        }
    
        if (isOnlineGame) {
            const onlineMatch = line.match(playerOnlineStartTurnRegEx);
            if (onlineMatch) {
                const alias = onlineMatch[1].trim();
                const playerName = onlineMatch[2].trim();
                if (debugFlag) console.log('Player Online Identified: ' + playerName)
                currentTurnPlayerId = await findOrInsertPlayer(dbGameId, playerName, alias, true);
            }
        } else {
            const offlineMatch = line.match(playerOfflineStartTurnRegEx);
            if (offlineMatch) {
                const extractedAlias = offlineMatch[1].trim();
                let playerName = playerAliasMap[extractedAlias] || await askForMapping(extractedAlias);
                if (debugFlag) console.log('Player Offline Identified: ' + playerName)
                currentTurnPlayerId = await findOrInsertPlayer(dbGameId, playerName, extractedAlias, false);
            }
        }
    }
    // Process fire weapon
    else if (line.includes('fires')) {
        if (debugFlag) console.log(`Processing 'fires' for line: ${line}`);
        const weaponMatch = line.match(/fires\s+(.+)/);
        const weaponName = weaponMatch?.[1];
        if (weaponName) {
            currentWeaponId = await new Promise<number>((resolve, reject) => {
                db.get('SELECT id FROM weapons WHERE name = ?', [weaponName], (err, row: WeaponRow | undefined) => {
                    if (err) reject(err);
                    if (row) {
                        resolve(row.id);
                    } else {
                        db.run('INSERT INTO weapons (name) VALUES (?)', [weaponName], function (err) {
                            if (err) reject(err);
                            resolve(this.lastID);
                        });
                    }
                });
            });
        }
    }
    // Inside the end turn processing logic with added debug output
    else if (line.match(endTurnRegEx)) {
        if (debugFlag) console.log(`Processing 'end or lose turn' for line: ${line}`);
        const match = line.match(endTurnRegEx);

        if (match && typeof turnStartTime !== 'undefined' && currentTurnPlayerId) {
            const turnEndReason = match[2]; // "ends turn" or "loses turn due to loss of control"
            const turnDuration = parseFloat(match[3]);
            const retreatTime = parseFloat(match[4]);

            // If no weapon was used, set currentWeaponId to "No Weapon" ID
            if (currentWeaponId === undefined) {
                currentWeaponId = await getNoWeaponId();
                console.log(`No weapon used in this turn. Assigning 'No Weapon' ID: ${currentWeaponId}`);
            }

            // Insert a new turn entry and capture the ID for turnId
            await new Promise<void>((resolve, reject) => {
                db.run(
                    'INSERT INTO turns (game_id, player_id, turn_number, reason) VALUES (?, ?, ?, ?)',
                    [dbGameId, currentTurnPlayerId, turnDuration, turnEndReason],
                    function (err) {
                        if (err) {
                            console.error("Error inserting turn:", err.message);
                            fileHasIssue = true;
                            resolve();
                        } else {
                            turnId = this.lastID;
                            if (debugFlag) {
                                console.log(`Turn ID ${turnId} created for player ID ${currentTurnPlayerId} with reason: ${turnEndReason}`);
                            }
                            resolve();
                        }
                    }
                );
            });

            // If `turnId` is still undefined after insertion, log the issue
            if (turnId === undefined) {
                console.error("Failed to obtain turnId after inserting turn. Check database constraints.");
                fileHasIssue = true;
                break;
            }
        } else {
            // Enhanced error output to include which part is missing
            if (!match) {
                console.error("End turn pattern did not match for line:", line);
            } else if (turnStartTime === undefined) {
                console.error("Turn start time is undefined for line:", line);
            } else if (!currentTurnPlayerId) {
                console.error("Current turn player ID is undefined for line:", line);
            }
            console.error("Turn information missing or could not match end turn pattern, cannot create turn entry.");
            fileHasIssue = true;
            break;  // Stop further processing due to missing turn information
        }
    }
    // Process damage logs
    else if (line.includes('Damage dealt')) {
        if (debugFlag) console.log(`Processing 'Damage dealt' for line: ${line}`);
        if (!turnId) {
            console.error('No valid turnId found for this damage event. Skipping...');
            fileHasIssue = true;
            break; // Stop further processing due to critical missing data
        }

        const damageEvents = line.split(',');

        for (const event of damageEvents) {
            if (debugFlag) console.log('event: ' + event)
            // Use different regex patterns for online and offline games
            const damageData = isOnlineGame ? event.match(onlineDamageRegex) : event.match(offlineDamageRegex);
            if (debugFlag) console.log('Damage data:' + damageData)
            if (damageData) {
                const damageAmount = parseInt(damageData[1], 10);
                const victimAlias = damageData[2].trim();
                const victimPlayerName = isOnlineGame && event.includes('kill') ? damageData[3]?.trim() : victimAlias;

                let victimId = await findOrInsertPlayer(dbGameId, victimPlayerName, victimAlias, isOnlineGame);
                if (debugFlag) console.log('Damage log Game:' + dbGameId + ' | dmg: ' + damageAmount + ' ' + victimAlias + ' ' + victimPlayerName + ' (' + victimId + ')');
                db.run('INSERT INTO damage_logs (game_id, player_id, weapon_id, damage, turn_id, victim_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [dbGameId, currentTurnPlayerId, currentWeaponId, damageAmount, turnId, victimId], function (err) {
                        if (err) {
                            console.error('Error inserting into damage_logs:', err.message);
                        } else {
                            if (debugFlag) console.log(`Damage log successfully inserted: Game ID: ${dbGameId}, Player ID: ${currentTurnPlayerId}, Weapon ID: ${currentWeaponId}, Damage: ${damageAmount}, Turn ID: ${turnId}, Victim ID: ${victimId}`);
                        }
                    });
            } else {
                console.error(`Failed to extract damage data from damage event: ${event}`);
                fileHasIssue = true;
                break; // Stop further processing due to malformed damage event
            }
        }
    }
    // Inside the loop processing each line
    else if (resultRegex.test(line)) {
        const resultMatch = line.match(resultRegex);
        if (debugFlag) console.info(resultMatch);

        if (resultMatch) {
            if (resultMatch[1]) {
                // It's a win, store the winner
                const winnerAlias = resultMatch[1].trim();
                
                // For offline games, map the alias to the player name if necessary
                const winnerPlayerName = playerAliasMap[winnerAlias] || winnerAlias;

                const winnerId = await findOrInsertPlayer(dbGameId, winnerPlayerName, winnerAlias, isOnlineGame);

                // Update the games table with the winner ID
                await new Promise<void>((resolve, reject) => {
                    db.run('UPDATE games SET winner_id = ? WHERE id = ?', [winnerId, dbGameId], function (err) {
                        if (err) {
                            console.error("Error updating winner in games table:", err.message);
                            return reject(err);
                        }
                        if (debugFlag) console.log(`Winner updated in games table: Game ID ${dbGameId}, Winner ID ${winnerId}`);
                        resolve();
                    });
                });

            } else {
                // It's a draw, store 0 as the winner_id
                await new Promise<void>((resolve, reject) => {
                    db.run('UPDATE games SET winner_id = 0 WHERE id = ?', [dbGameId], function (err) {
                        if (err) {
                            console.error("Error updating games table for draw:", err.message);
                            return reject(err);
                        }
                        console.log(`Draw recorded in games table with winner_id set to 0: Game ID ${dbGameId}`);
                        resolve();
                    });
                });
            }

            // Exit the loop once the result (winner or draw) is found
            break;
        }
    }
}

if (isUnexpectedEnd || hasChecksumError) {
    const issueType = isUnexpectedEnd ? "Unexpected End" : "Checksum Error";
    const logEntry = `${filePath} - ${issueType}\n`;
    fs.appendFileSync(unexpectedEndLogPath, logEntry, 'utf8');

    // Set winner_id to -1 in the database for this game if it ended unexpectedly
    if (isUnexpectedEnd) {
        await new Promise<void>((resolve, reject) => {
            db.run('UPDATE games SET winner_id = -1 WHERE id = ?', [dbGameId], function (err) {
                if (err) {
                    console.error("Error updating winner in games table for unexpected end:", err.message);
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

// After exiting the loop, check if file processing encountered an issue
if (fileHasIssue) {
    // Log file path to external file
    fs.appendFileSync(unexpectedEndLogPath, `${filePath}\n`, 'utf8');
    // Rollback the transaction due to the file issue
    await new Promise<void>((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
            if (err) {
                console.error('Error during rollback due to log file issue:', err.message);
                return reject(err);
            }
            console.log(`Rollback successful. Skipping further processing for ${logFileName} due to log file issue.`);
            resolve();
        });
    });
} else {
    // Commit transaction if there was no issue with the file
    await new Promise<void>((resolve, reject) => {
        db.run('COMMIT', (err) => {
            if (err) return reject(err);
            console.log(`Game log ${logFileName} successfully uploaded!`);
            resolve();
        });
    });
}

    } catch (error) {
        console.error(`Error processing log file ${logFileName}:`, (error as Error).message);

        // Rollback the transaction only if it was started
        if (transactionStarted) {
            await new Promise<void>((resolve) => {
                db.run('ROLLBACK', (err) => {
                    if (err) console.error('Error during rollback:', err.message);
                    console.warn(`Rolled back changes for ${logFileName} due to an error.`);
                    resolve();
                });
            });
        }
    }

    // Reset variables after processing each file
    currentTurnPlayerId = undefined;
    currentWeaponId = undefined;
    turnStartTime = undefined;
    turnId = undefined;
    lines = [];
    logFileName = '';
    isOnlineGame = false;
    gameType = 'false';
}



 
// Example usage ---- MAIN ------
//console.log("Database initialized, proceeding with other tasks...");



fs.readdir(logsDirectory, (err, files) => {
    if (err) throw err;
  
    const logFiles = files
      .filter(file => {
        const isLogFile = path.extname(file) === '.log';
        const matchesDate = targetDate === "" || file.includes(targetDate);
        
        // Debug output for filtering logic
        console.log(`Checking file: ${file}, isLogFile: ${isLogFile}, matchesDate: ${matchesDate}`);
        
        return isLogFile && matchesDate; // Apply both checks
      })
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(logsDirectory, file)).mtime.getTime() // Get modification time
      }))
      .sort((a, b) => b.time - a.time) // Sort by modification time (newest first)
      .map(file => file.name); // Extract file names after sorting
  
    // Final log to confirm filtered files
    console.log("Files to be processed:", logFiles);


  
     // Process each file as per the existing logic
  (async function processLogsSequentially() {
    let processedCount = 0;
    let addedCount = 0;
    let failedCount = 0;

    for (const file of logFiles) {
      const filePath = path.join(logsDirectory, file);

      try {
        await parseAndUploadLog(filePath);
        console.info(`Successfully added file: ${file}`);
        addedCount++;
      } catch (error) {
        console.error(`Failed to process file: ${file}, Error: ${(error as Error).message}`);
        failedCount++;
      } finally {
        processedCount++;
      }
    }
    
    // Print summary of processing
    console.info(`--- Summary ---`);
    console.info(`Total files processed: ${processedCount}`);
    console.info(`Files successfully added: ${addedCount}`);
    console.info(`Files failed: ${failedCount}`);
  })();
});
  
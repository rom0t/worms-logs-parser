"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var sqlite3 = require("sqlite3");
var readline = require("readline");
var iconv = require("iconv-lite");
// Your Worms Directory where the logs are extracted
var logsDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/';
// Path to the log file for games that ended unexpectedly
var unexpectedEndLogPath = path.join(logsDirectory, 'unexpected_end_games.log');
// Set up SQLite connection
var db = new sqlite3.Database('./worms_stats_db.sqlite');
var debugFlag = false;
var targetDate = ""; // Set as "2024-10-31" for debugging files on a specific day/hour or leave blank to process all logs
var playerAliasMap = {};
//const playerAliasRegex = /([A-Za-z]+):\s"([^"]+)"\sas\s"([^"]+)"/;
var playerAliasRegex = /(.+):\s"([^"]+)"\sas\s"([^"]+)"/;
var OnlinePlayerRegex = /.+?"(.+?)"\s+as\s+"(.+?)"/;
var OfflineAliasRegex = /\"(.+)\"/;
var timeLoggingRegEx = /Game Started at (.+) GMT/;
var playerOnlineStartTurnRegEx = /\]\s...\s(.+)\s\((.*?)\)\s+starts turn/;
var playerOfflineStartTurnRegEx = /\]\s...\s(.*)\s+starts turn/;
var resultRegex = /(.+) gewinnt.+|Die Runde endete unentschieden/;
var onlineDamageRegex = /(\d+)\s(?:\(\d+\skills?\)\s*to|to)\s(.+)\s\((.*?)\)/;
var offlineDamageRegex = /(\d+)\s(?:\(\d+\s+kills?\)\s*to|to)\s+(.+)/;
var timeMatchRegEx = /\[([0-9:.]+)\]/;
// Updated regex to capture both "ends turn" and "loses turn due to loss of control"
var endTurnRegEx = /\[([\d:.]+)\]\s+•••\s(.+?)\s(?:ends turn|loses turn due to loss of control); time used: ([\d.]+) sec turn, ([\d.]+) sec retreat/;
var processedCount = 0;
var addedCount = 0;
var failedCount = 0;
// Function to initialize player alias mapping from the database
function initializePlayerAliasMappingFromDb() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    db.all("SELECT alias, name FROM player_aliases JOIN players ON player_aliases.player_id = players.id", [], function (err, rows) {
                        if (err) {
                            return reject(err);
                        }
                        rows.forEach(function (row) {
                            playerAliasMap[row.alias] = row.name; // Prepopulate playerAliasMap
                        });
                        resolve();
                    });
                })];
        });
    });
}
// Function to get the "No Weapon" ID with detailed debug output
function getNoWeaponId() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    db.get('SELECT id FROM weapons WHERE name = ?', ['No Weapon'], function (err, row) {
                        if (err)
                            return reject(err);
                        if (row) {
                            console.log("\"No Weapon\" ID found: ".concat(row.id));
                            resolve(row.id);
                        }
                        else {
                            // Insert "No Weapon" entry if it doesn't exist
                            db.run('INSERT INTO weapons (name) VALUES (?)', ['No Weapon'], function (err) {
                                if (err)
                                    return reject(err);
                                console.log("\"No Weapon\" inserted with ID: ".concat(this.lastID));
                                resolve(this.lastID);
                            });
                        }
                    });
                })];
        });
    });
}
// Database check function for existing alias mapping
function findPlayerForAlias(alias) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    db.get('SELECT p.name FROM players p JOIN player_aliases pa ON p.id = pa.player_id WHERE pa.alias = ?', [alias], function (err, row) {
                        if (err)
                            return reject(err);
                        resolve(row ? row.name : null);
                    });
                })];
        });
    });
}
// Function to initialize player and alias mapping from the log lines
function initializePlayerAliasMapping(lines, isOnlineGame) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, lines_1, line, match, alias, playerName, dbPlayerName;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _i = 0, lines_1 = lines;
                    _c.label = 1;
                case 1:
                    if (!(_i < lines_1.length)) return [3 /*break*/, 11];
                    line = lines_1[_i];
                    match = line.match(isOnlineGame ? OnlinePlayerRegex : OfflineAliasRegex);
                    if (!match) return [3 /*break*/, 8];
                    alias = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.trim();
                    playerName = isOnlineGame ? (_b = match[2]) === null || _b === void 0 ? void 0 : _b.trim() : undefined;
                    if (!alias) {
                        console.error("Alias could not be determined from the line:", line);
                        return [3 /*break*/, 10]; // Skip this line if alias is undefined
                    }
                    if (!!isOnlineGame) return [3 /*break*/, 6];
                    return [4 /*yield*/, findPlayerForAlias(alias)];
                case 2:
                    dbPlayerName = _c.sent();
                    if (!dbPlayerName) return [3 /*break*/, 3];
                    playerAliasMap[alias] = dbPlayerName;
                    return [3 /*break*/, 5];
                case 3:
                    if (!!playerAliasMap[alias]) return [3 /*break*/, 5];
                    return [4 /*yield*/, askForMapping(alias)];
                case 4:
                    // Ask for mapping if alias is unknown
                    playerName = _c.sent();
                    playerAliasMap[alias] = playerName;
                    _c.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    if (playerName) {
                        // For online games, use the player name from the log if available
                        playerAliasMap[alias] = playerName;
                    }
                    else {
                        console.error("Player name is missing for online game alias:", alias);
                    }
                    _c.label = 7;
                case 7:
                    if (debugFlag)
                        console.log("Mapped alias: ".concat(alias, " to player: ").concat(playerName || playerAliasMap[alias]));
                    return [3 /*break*/, 9];
                case 8:
                    if (debugFlag)
                        console.warn("No match found for line:", line);
                    _c.label = 9;
                case 9:
                    // Stop at gameplay lines
                    if (line.includes('•••')) {
                        return [3 /*break*/, 11];
                    }
                    _c.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 1];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// Function to prompt for player mapping if alias is unknown
function askForMapping(alias) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question("Alias ".concat(alias, " is not mapped to a player. Please provide the player name for this alias: "), function (playerName) {
                        rl.close();
                        resolve(playerName);
                    });
                })];
        });
    });
}
// Function to find or insert a player into the database
function findOrInsertPlayer(gameId, playerName, alias, isOnlineGame) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (isOnlineGame && !playerName) {
                throw new Error('Player name is required for online games.');
            }
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    db.get('SELECT pa.player_id FROM player_aliases pa WHERE alias = ?', [alias], function (err, row) { return __awaiter(_this, void 0, void 0, function () {
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (err)
                                        return [2 /*return*/, reject(err)];
                                    if (!(row && row.player_id)) return [3 /*break*/, 1];
                                    resolve(row.player_id); // Alias already exists, return player_id
                                    return [3 /*break*/, 4];
                                case 1:
                                    _a = playerAliasMap[alias] || playerName;
                                    if (_a) return [3 /*break*/, 3];
                                    return [4 /*yield*/, askForMapping(alias)];
                                case 2:
                                    _a = (_b.sent());
                                    _b.label = 3;
                                case 3:
                                    // Check if alias has a player name from playerAliasMap or manually mapped
                                    playerName = _a;
                                    db.get('SELECT id FROM players WHERE name = ?', [playerName], function (err, playerRow) {
                                        if (err)
                                            return reject(err);
                                        var playerId = playerRow === null || playerRow === void 0 ? void 0 : playerRow.id;
                                        if (playerId !== undefined) { // Ensure playerId is defined
                                            // Player exists, insert alias mapping
                                            db.run('INSERT INTO player_aliases (player_id, alias) VALUES (?, ?)', [playerId, alias], function (err) {
                                                if (err)
                                                    return reject(err);
                                                resolve(playerId); // Use "!" to assert that playerId is a number here
                                            });
                                        }
                                        else {
                                            // Insert new player and alias
                                            db.run('INSERT INTO players (name) VALUES (?)', [playerName], function (err) {
                                                if (err)
                                                    return reject(err);
                                                playerId = this.lastID;
                                                // Ensure playerId is defined before resolving
                                                db.run('INSERT INTO player_aliases (player_id, alias) VALUES (?, ?)', [playerId, alias], function (err) {
                                                    if (err)
                                                        return reject(err);
                                                    resolve(playerId); // Use "!" to assert that playerId is a number here
                                                });
                                            });
                                        }
                                    });
                                    _b.label = 4;
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                })];
        });
    });
}
// Function to handle "Sudden Death" by setting a sequential turn number
function processSuddenDeath(dbGameId, playerIds) {
    return __awaiter(this, void 0, void 0, function () {
        var lastTurnNumber, suddenDeathTurnNumber, _loop_1, _i, playerIds_1, playerId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Processing 'Sudden Death' event for all players involved in the game");
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            db.get('SELECT MAX(turn_number) as lastTurnNumber FROM turns WHERE game_id = ?', [dbGameId], function (err, row) {
                                if (err) {
                                    console.error("Error retrieving last turn number:", err.message);
                                    return reject(err);
                                }
                                resolve(row.lastTurnNumber || 0); // If no turns exist yet, start from 0
                            });
                        })];
                case 1:
                    lastTurnNumber = _a.sent();
                    suddenDeathTurnNumber = lastTurnNumber + 1;
                    _loop_1 = function (playerId) {
                        var error_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            db.run('INSERT INTO turns (game_id, player_id, turn_number, reason) VALUES (?, ?, ?, ?)', [dbGameId, playerId, suddenDeathTurnNumber, 'Sudden Death'], function (err) {
                                                if (err) {
                                                    console.error("Error inserting Sudden Death turn:", err.message);
                                                    return reject(err);
                                                }
                                                console.log("Inserted 'Sudden Death' event for player ID: ".concat(playerId, " with turn number: ").concat(suddenDeathTurnNumber));
                                                resolve();
                                            });
                                        })];
                                case 1:
                                    _b.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_1 = _b.sent();
                                    console.error("Error processing Sudden Death for player ID ".concat(playerId, ":"), error_1.message);
                                    throw error_1; // Rethrow to trigger rollback if needed
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, playerIds_1 = playerIds;
                    _a.label = 2;
                case 2:
                    if (!(_i < playerIds_1.length)) return [3 /*break*/, 5];
                    playerId = playerIds_1[_i];
                    return [5 /*yield**/, _loop_1(playerId)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Function to parse game metadata from the log
function parseLogMetadata(logContent) {
    var gameDateMatch = logContent.match(/Game Started at (.+) GMT/);
    var gameDate = gameDateMatch ? gameDateMatch[1] : 'Unknown Date';
    var engineVersionMatch = logContent.match(/Game Engine Version: (.+)/);
    var engineVersion = engineVersionMatch ? engineVersionMatch[1] : 'Unknown Version';
    var gameId = "offline_".concat(gameDate.replace(/[- :]/g, ''));
    return { gameId: gameId, gameDate: gameDate, engineVersion: engineVersion };
}
// Function to check if a log file has already been processed
function isFileProcessed(logFileName) {
    return new Promise(function (resolve, reject) {
        db.get('SELECT log_file_name FROM games WHERE log_file_name = ?', [logFileName], function (err, row) {
            if (err)
                return reject(err);
            resolve(!!row); // Returns true if the file is already processed
        });
    });
}
function parseAndUploadLog(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var logContentBuffer, logContent, lines, logFileName, isOnlineGame, gameType, currentTurnPlayerId, currentWeaponId, turnStartTime, turnId, transactionStarted, isUnexpectedEnd, hasChecksumError, rollbackError_1, alreadyProcessed, gameDateMatch, gameDate_1, dbGameId_1, fileHasIssue_1, _loop_2, _i, lines_2, line, state_1, issueType, logEntry, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: 
                // Initialize the playerAliasMap with known items from the database
                return [4 /*yield*/, initializePlayerAliasMappingFromDb()];
                case 1:
                    // Initialize the playerAliasMap with known items from the database
                    _b.sent();
                    logContentBuffer = fs.readFileSync(filePath);
                    logContent = iconv.decode(logContentBuffer, 'windows-1252');
                    lines = logContent.split('\n');
                    logFileName = path.basename(filePath);
                    isOnlineGame = logFileName.includes('Online');
                    gameType = isOnlineGame ? 'Online' : 'Offline';
                    currentTurnPlayerId = undefined;
                    currentWeaponId = undefined;
                    turnStartTime = undefined;
                    turnId = undefined;
                    transactionStarted = false;
                    isUnexpectedEnd = false;
                    hasChecksumError = false;
                    console.log("Processing log file: ".concat(logFileName, ", Game Type: ").concat(gameType));
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, new Promise(function (resolve) {
                            db.run('ROLLBACK', function (err) {
                                if (err && !err.message.includes('no transaction is active')) {
                                    console.error("Error while rolling back any previous open transactions:", err.message);
                                }
                                else {
                                    if (debugFlag)
                                        console.log("No active transaction to rollback.");
                                }
                                resolve();
                            });
                        })];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    rollbackError_1 = _b.sent();
                    console.error("Unexpected error during rollback:", rollbackError_1.message);
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, isFileProcessed(logFileName)];
                case 6:
                    alreadyProcessed = _b.sent();
                    if (alreadyProcessed) {
                        console.warn("Log file ".concat(logFileName, " has already been processed. Skipping..."));
                        return [2 /*return*/];
                    }
                    console.log("Log file ".concat(logFileName, " starts with being processed."));
                    _b.label = 7;
                case 7:
                    _b.trys.push([7, 21, , 24]);
                    // Start transaction
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            db.run('BEGIN TRANSACTION', function (err) {
                                if (err)
                                    return reject(new Error("A transaction is already in progress."));
                                transactionStarted = true;
                                resolve();
                            });
                        })];
                case 8:
                    // Start transaction
                    _b.sent();
                    gameDateMatch = logContent.match(timeLoggingRegEx);
                    gameDate_1 = gameDateMatch ? gameDateMatch[1] : 'Unknown Date';
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            db.run('INSERT INTO games (game_date, game_type, log_file_name) VALUES (?, ?, ?)', [gameDate_1, gameType, logFileName], function (err) {
                                if (err)
                                    return reject(err);
                                resolve(this.lastID);
                            });
                        })];
                case 9:
                    dbGameId_1 = _b.sent();
                    return [4 /*yield*/, initializePlayerAliasMapping(lines, isOnlineGame)];
                case 10:
                    _b.sent();
                    fileHasIssue_1 = false;
                    _loop_2 = function (line) {
                        var playerIds, _c, _d, timeMatch, timeParts, onlineMatch, alias, playerName, offlineMatch, extractedAlias, playerName, _e, weaponMatch, weaponName_1, match, turnEndReason_1, turnDuration_1, retreatTime, damageEvents, _loop_3, _f, damageEvents_1, event_1, state_2, resultMatch, winnerAlias, winnerPlayerName, winnerId_1;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    if (debugFlag)
                                        console.log("Processing line: ".concat(line));
                                    // Check for unexpected game end due to quitting
                                    if (line.includes("is quitting") || line.includes("disconnecting") || line.includes("Game Ends - User Quit")) {
                                        isUnexpectedEnd = true;
                                        if (debugFlag)
                                            console.warn("Unexpected game end detected in file: ".concat(filePath));
                                    }
                                    if (!line.includes('Checksum')) return [3 /*break*/, 1];
                                    console.error("ISSUE WITH THIS LOG FILE, TRY NEW EXTRACT: ".concat(logFileName));
                                    fileHasIssue_1 = true;
                                    hasChecksumError = true;
                                    return [2 /*return*/, "break"];
                                case 1:
                                    if (!line.includes("Sudden Death")) return [3 /*break*/, 4];
                                    console.log("Processing 'Sudden Death' event for line: ".concat(line));
                                    playerIds = Object.values(playerAliasMap).map(function (name) {
                                        var playerId = findOrInsertPlayer(dbGameId_1, name, name, isOnlineGame);
                                        return playerId;
                                    });
                                    _c = processSuddenDeath;
                                    _d = [dbGameId_1];
                                    return [4 /*yield*/, Promise.all(playerIds)];
                                case 2: 
                                // Process Sudden Death for all players with the sequential turn number
                                return [4 /*yield*/, _c.apply(void 0, _d.concat([_g.sent()]))];
                                case 3:
                                    // Process Sudden Death for all players with the sequential turn number
                                    _g.sent();
                                    return [3 /*break*/, 32];
                                case 4:
                                    if (!line.includes('starts turn')) return [3 /*break*/, 12];
                                    if (debugFlag)
                                        console.log("Processing 'starts turn' for line: ".concat(line));
                                    timeMatch = line.match(timeMatchRegEx);
                                    if (timeMatch) {
                                        timeParts = timeMatch[1].split(':');
                                        turnStartTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
                                    }
                                    if (!isOnlineGame) return [3 /*break*/, 7];
                                    onlineMatch = line.match(playerOnlineStartTurnRegEx);
                                    if (!onlineMatch) return [3 /*break*/, 6];
                                    alias = onlineMatch[1].trim();
                                    playerName = onlineMatch[2].trim();
                                    if (debugFlag)
                                        console.log('Player Online Identified: ' + playerName);
                                    return [4 /*yield*/, findOrInsertPlayer(dbGameId_1, playerName, alias, true)];
                                case 5:
                                    currentTurnPlayerId = _g.sent();
                                    _g.label = 6;
                                case 6: return [3 /*break*/, 11];
                                case 7:
                                    offlineMatch = line.match(playerOfflineStartTurnRegEx);
                                    if (!offlineMatch) return [3 /*break*/, 11];
                                    extractedAlias = offlineMatch[1].trim();
                                    _e = playerAliasMap[extractedAlias];
                                    if (_e) return [3 /*break*/, 9];
                                    return [4 /*yield*/, askForMapping(extractedAlias)];
                                case 8:
                                    _e = (_g.sent());
                                    _g.label = 9;
                                case 9:
                                    playerName = _e;
                                    if (debugFlag)
                                        console.log('Player Offline Identified: ' + playerName);
                                    return [4 /*yield*/, findOrInsertPlayer(dbGameId_1, playerName, extractedAlias, false)];
                                case 10:
                                    currentTurnPlayerId = _g.sent();
                                    _g.label = 11;
                                case 11: return [3 /*break*/, 32];
                                case 12:
                                    if (!line.includes('fires')) return [3 /*break*/, 15];
                                    if (debugFlag)
                                        console.log("Processing 'fires' for line: ".concat(line));
                                    weaponMatch = line.match(/fires\s+(.+)/);
                                    weaponName_1 = weaponMatch === null || weaponMatch === void 0 ? void 0 : weaponMatch[1];
                                    if (!weaponName_1) return [3 /*break*/, 14];
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            db.get('SELECT id FROM weapons WHERE name = ?', [weaponName_1], function (err, row) {
                                                if (err)
                                                    reject(err);
                                                if (row) {
                                                    resolve(row.id);
                                                }
                                                else {
                                                    db.run('INSERT INTO weapons (name) VALUES (?)', [weaponName_1], function (err) {
                                                        if (err)
                                                            reject(err);
                                                        resolve(this.lastID);
                                                    });
                                                }
                                            });
                                        })];
                                case 13:
                                    currentWeaponId = _g.sent();
                                    _g.label = 14;
                                case 14: return [3 /*break*/, 32];
                                case 15:
                                    if (!line.match(endTurnRegEx)) return [3 /*break*/, 21];
                                    if (debugFlag)
                                        console.log("Processing 'end or lose turn' for line: ".concat(line));
                                    match = line.match(endTurnRegEx);
                                    if (!(match && typeof turnStartTime !== 'undefined' && currentTurnPlayerId)) return [3 /*break*/, 19];
                                    turnEndReason_1 = match[2];
                                    turnDuration_1 = parseFloat(match[3]);
                                    retreatTime = parseFloat(match[4]);
                                    if (!(currentWeaponId === undefined)) return [3 /*break*/, 17];
                                    return [4 /*yield*/, getNoWeaponId()];
                                case 16:
                                    currentWeaponId = _g.sent();
                                    console.log("No weapon used in this turn. Assigning 'No Weapon' ID: ".concat(currentWeaponId));
                                    _g.label = 17;
                                case 17: 
                                // Insert a new turn entry and capture the ID for turnId
                                return [4 /*yield*/, new Promise(function (resolve, reject) {
                                        db.run('INSERT INTO turns (game_id, player_id, turn_number, reason) VALUES (?, ?, ?, ?)', [dbGameId_1, currentTurnPlayerId, turnDuration_1, turnEndReason_1], function (err) {
                                            if (err) {
                                                console.error("Error inserting turn:", err.message);
                                                fileHasIssue_1 = true;
                                                resolve();
                                            }
                                            else {
                                                turnId = this.lastID;
                                                if (debugFlag) {
                                                    console.log("Turn ID ".concat(turnId, " created for player ID ").concat(currentTurnPlayerId, " with reason: ").concat(turnEndReason_1));
                                                }
                                                resolve();
                                            }
                                        });
                                    })];
                                case 18:
                                    // Insert a new turn entry and capture the ID for turnId
                                    _g.sent();
                                    // If `turnId` is still undefined after insertion, log the issue
                                    if (turnId === undefined) {
                                        console.error("Failed to obtain turnId after inserting turn. Check database constraints.");
                                        fileHasIssue_1 = true;
                                        return [2 /*return*/, "break"];
                                    }
                                    return [3 /*break*/, 20];
                                case 19:
                                    // Enhanced error output to include which part is missing
                                    if (!match) {
                                        console.error("End turn pattern did not match for line:", line);
                                    }
                                    else if (turnStartTime === undefined) {
                                        console.error("Turn start time is undefined for line:", line);
                                    }
                                    else if (!currentTurnPlayerId) {
                                        console.error("Current turn player ID is undefined for line:", line);
                                    }
                                    console.error("Turn information missing or could not match end turn pattern, cannot create turn entry.");
                                    fileHasIssue_1 = true;
                                    return [2 /*return*/, "break"];
                                case 20: return [3 /*break*/, 32];
                                case 21:
                                    if (!line.includes('Damage dealt')) return [3 /*break*/, 26];
                                    if (debugFlag)
                                        console.log("Processing 'Damage dealt' for line: ".concat(line));
                                    if (!turnId) {
                                        console.error('No valid turnId found for this damage event. Skipping...');
                                        fileHasIssue_1 = true;
                                        return [2 /*return*/, "break"];
                                    }
                                    damageEvents = line.split(',');
                                    _loop_3 = function (event_1) {
                                        var damageData, damageAmount_1, victimAlias, victimPlayerName, victimId_1;
                                        return __generator(this, function (_h) {
                                            switch (_h.label) {
                                                case 0:
                                                    if (debugFlag)
                                                        console.log('event: ' + event_1);
                                                    damageData = isOnlineGame ? event_1.match(onlineDamageRegex) : event_1.match(offlineDamageRegex);
                                                    if (debugFlag)
                                                        console.log('Damage data:' + damageData);
                                                    if (!damageData) return [3 /*break*/, 2];
                                                    damageAmount_1 = parseInt(damageData[1], 10);
                                                    victimAlias = damageData[2].trim();
                                                    victimPlayerName = isOnlineGame && event_1.includes('kill') ? (_a = damageData[3]) === null || _a === void 0 ? void 0 : _a.trim() : victimAlias;
                                                    return [4 /*yield*/, findOrInsertPlayer(dbGameId_1, victimPlayerName, victimAlias, isOnlineGame)];
                                                case 1:
                                                    victimId_1 = _h.sent();
                                                    if (debugFlag)
                                                        console.log('Damage log Game:' + dbGameId_1 + ' | dmg: ' + damageAmount_1 + ' ' + victimAlias + ' ' + victimPlayerName + ' (' + victimId_1 + ')');
                                                    db.run('INSERT INTO damage_logs (game_id, player_id, weapon_id, damage, turn_id, victim_id) VALUES (?, ?, ?, ?, ?, ?)', [dbGameId_1, currentTurnPlayerId, currentWeaponId, damageAmount_1, turnId, victimId_1], function (err) {
                                                        if (err) {
                                                            console.error('Error inserting into damage_logs:', err.message);
                                                        }
                                                        else {
                                                            if (debugFlag)
                                                                console.log("Damage log successfully inserted: Game ID: ".concat(dbGameId_1, ", Player ID: ").concat(currentTurnPlayerId, ", Weapon ID: ").concat(currentWeaponId, ", Damage: ").concat(damageAmount_1, ", Turn ID: ").concat(turnId, ", Victim ID: ").concat(victimId_1));
                                                        }
                                                    });
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    console.error("Failed to extract damage data from damage event: ".concat(event_1));
                                                    fileHasIssue_1 = true;
                                                    return [2 /*return*/, "break"];
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _f = 0, damageEvents_1 = damageEvents;
                                    _g.label = 22;
                                case 22:
                                    if (!(_f < damageEvents_1.length)) return [3 /*break*/, 25];
                                    event_1 = damageEvents_1[_f];
                                    return [5 /*yield**/, _loop_3(event_1)];
                                case 23:
                                    state_2 = _g.sent();
                                    if (state_2 === "break")
                                        return [3 /*break*/, 25];
                                    _g.label = 24;
                                case 24:
                                    _f++;
                                    return [3 /*break*/, 22];
                                case 25: return [3 /*break*/, 32];
                                case 26:
                                    if (!resultRegex.test(line)) return [3 /*break*/, 32];
                                    resultMatch = line.match(resultRegex);
                                    if (debugFlag)
                                        console.info(resultMatch);
                                    if (!resultMatch) return [3 /*break*/, 32];
                                    if (!resultMatch[1]) return [3 /*break*/, 29];
                                    winnerAlias = resultMatch[1].trim();
                                    winnerPlayerName = playerAliasMap[winnerAlias] || winnerAlias;
                                    return [4 /*yield*/, findOrInsertPlayer(dbGameId_1, winnerPlayerName, winnerAlias, isOnlineGame)];
                                case 27:
                                    winnerId_1 = _g.sent();
                                    // Update the games table with the winner ID
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            db.run('UPDATE games SET winner_id = ? WHERE id = ?', [winnerId_1, dbGameId_1], function (err) {
                                                if (err) {
                                                    console.error("Error updating winner in games table:", err.message);
                                                    return reject(err);
                                                }
                                                if (debugFlag)
                                                    console.log("Winner updated in games table: Game ID ".concat(dbGameId_1, ", Winner ID ").concat(winnerId_1));
                                                resolve();
                                            });
                                        })];
                                case 28:
                                    // Update the games table with the winner ID
                                    _g.sent();
                                    return [3 /*break*/, 31];
                                case 29: 
                                // It's a draw, store 0 as the winner_id
                                return [4 /*yield*/, new Promise(function (resolve, reject) {
                                        db.run('UPDATE games SET winner_id = 0 WHERE id = ?', [dbGameId_1], function (err) {
                                            if (err) {
                                                console.error("Error updating games table for draw:", err.message);
                                                return reject(err);
                                            }
                                            console.log("Draw recorded in games table with winner_id set to 0: Game ID ".concat(dbGameId_1));
                                            resolve();
                                        });
                                    })];
                                case 30:
                                    // It's a draw, store 0 as the winner_id
                                    _g.sent();
                                    _g.label = 31;
                                case 31: return [2 /*return*/, "break"];
                                case 32: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, lines_2 = lines;
                    _b.label = 11;
                case 11:
                    if (!(_i < lines_2.length)) return [3 /*break*/, 14];
                    line = lines_2[_i];
                    return [5 /*yield**/, _loop_2(line)];
                case 12:
                    state_1 = _b.sent();
                    if (state_1 === "break")
                        return [3 /*break*/, 14];
                    _b.label = 13;
                case 13:
                    _i++;
                    return [3 /*break*/, 11];
                case 14:
                    if (!(isUnexpectedEnd || hasChecksumError)) return [3 /*break*/, 16];
                    issueType = isUnexpectedEnd ? "Unexpected End" : "Checksum Error";
                    logEntry = "".concat(filePath, " - ").concat(issueType, "\n");
                    fs.appendFileSync(unexpectedEndLogPath, logEntry, 'utf8');
                    if (!isUnexpectedEnd) return [3 /*break*/, 16];
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            db.run('UPDATE games SET winner_id = -1 WHERE id = ?', [dbGameId_1], function (err) {
                                if (err) {
                                    console.error("Error updating winner in games table for unexpected end:", err.message);
                                    return reject(err);
                                }
                                resolve();
                            });
                        })];
                case 15:
                    _b.sent();
                    _b.label = 16;
                case 16:
                    if (!fileHasIssue_1) return [3 /*break*/, 18];
                    // Log file path to external file
                    fs.appendFileSync(unexpectedEndLogPath, "".concat(filePath, "\n"), 'utf8');
                    // Rollback the transaction due to the file issue
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            db.run('ROLLBACK', function (err) {
                                if (err) {
                                    console.error('Error during rollback due to log file issue:', err.message);
                                    return reject(err);
                                }
                                console.log("Rollback successful. Skipping further processing for ".concat(logFileName, " due to log file issue."));
                                resolve();
                            });
                        })];
                case 17:
                    // Rollback the transaction due to the file issue
                    _b.sent();
                    return [3 /*break*/, 20];
                case 18: 
                // Commit transaction if there was no issue with the file
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        db.run('COMMIT', function (err) {
                            if (err)
                                return reject(err);
                            console.log("Game log ".concat(logFileName, " successfully uploaded!"));
                            resolve();
                        });
                    })];
                case 19:
                    // Commit transaction if there was no issue with the file
                    _b.sent();
                    _b.label = 20;
                case 20: return [3 /*break*/, 24];
                case 21:
                    error_2 = _b.sent();
                    console.error("Error processing log file ".concat(logFileName, ":"), error_2.message);
                    if (!transactionStarted) return [3 /*break*/, 23];
                    return [4 /*yield*/, new Promise(function (resolve) {
                            db.run('ROLLBACK', function (err) {
                                if (err)
                                    console.error('Error during rollback:', err.message);
                                console.warn("Rolled back changes for ".concat(logFileName, " due to an error."));
                                resolve();
                            });
                        })];
                case 22:
                    _b.sent();
                    _b.label = 23;
                case 23: return [3 /*break*/, 24];
                case 24:
                    // Reset variables after processing each file
                    currentTurnPlayerId = undefined;
                    currentWeaponId = undefined;
                    turnStartTime = undefined;
                    turnId = undefined;
                    lines = [];
                    logFileName = '';
                    isOnlineGame = false;
                    gameType = 'false';
                    return [2 /*return*/];
            }
        });
    });
}
// Example usage ---- MAIN ------
//console.log("Database initialized, proceeding with other tasks...");
fs.readdir(logsDirectory, function (err, files) {
    if (err)
        throw err;
    var logFiles = files
        .filter(function (file) {
        var isLogFile = path.extname(file) === '.log';
        var matchesDate = targetDate === "" || file.includes(targetDate);
        // Debug output for filtering logic
        console.log("Checking file: ".concat(file, ", isLogFile: ").concat(isLogFile, ", matchesDate: ").concat(matchesDate));
        return isLogFile && matchesDate; // Apply both checks
    })
        .map(function (file) { return ({
        name: file,
        time: fs.statSync(path.join(logsDirectory, file)).mtime.getTime() // Get modification time
    }); })
        .sort(function (a, b) { return b.time - a.time; }) // Sort by modification time (newest first)
        .map(function (file) { return file.name; }); // Extract file names after sorting
    // Final log to confirm filtered files
    console.log("Files to be processed:", logFiles);
    // Process each file as per the existing logic
    (function processLogsSequentially() {
        return __awaiter(this, void 0, void 0, function () {
            var processedCount, addedCount, failedCount, _i, logFiles_1, file, filePath, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        processedCount = 0;
                        addedCount = 0;
                        failedCount = 0;
                        _i = 0, logFiles_1 = logFiles;
                        _a.label = 1;
                    case 1:
                        if (!(_i < logFiles_1.length)) return [3 /*break*/, 7];
                        file = logFiles_1[_i];
                        filePath = path.join(logsDirectory, file);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, parseAndUploadLog(filePath)];
                    case 3:
                        _a.sent();
                        console.info("Successfully added file: ".concat(file));
                        addedCount++;
                        return [3 /*break*/, 6];
                    case 4:
                        error_3 = _a.sent();
                        console.error("Failed to process file: ".concat(file, ", Error: ").concat(error_3.message));
                        failedCount++;
                        return [3 /*break*/, 6];
                    case 5:
                        processedCount++;
                        return [7 /*endfinally*/];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7:
                        // Print summary of processing
                        console.info("--- Summary ---");
                        console.info("Total files processed: ".concat(processedCount));
                        console.info("Files successfully added: ".concat(addedCount));
                        console.info("Files failed: ".concat(failedCount));
                        return [2 /*return*/];
                }
            });
        });
    })();
});

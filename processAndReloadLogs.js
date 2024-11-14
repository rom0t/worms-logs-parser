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
var child_process_1 = require("child_process");
// Paths
var logFilePath = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/unexpected_end_games.log';
//const gamesDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games';
var gamesDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/';
var powershellScriptPath = 'C:/TestGames/temp/extractWAGAMlog.ps1';
// Function to delete log files corresponding to checksum errors
function deleteChecksumErrorLogs() {
    return __awaiter(this, void 0, void 0, function () {
        var data, lines, logFilesToDelete, _i, logFilesToDelete_1, logFilePath_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Reading unexpected_end_games.log to find files with checksum errors...");
                    return [4 /*yield*/, fs.promises.readFile(logFilePath, 'utf8')];
                case 1:
                    data = _a.sent();
                    console.log("Log file contents:\n", data);
                    lines = data.split('\n').filter(function (line) { return line.includes('Checksum Error'); });
                    console.log("Found ".concat(lines.length, " lines with \"Checksum Error\""));
                    logFilesToDelete = lines.map(function (line) {
                        // Find the .log file path within the line
                        var match = line.match(/(C:\\.*?\.log)/);
                        if (match) {
                            console.log("Identified log file to delete: ".concat(match[0]));
                        }
                        return match ? match[0] : null;
                    }).filter(Boolean);
                    _i = 0, logFilesToDelete_1 = logFilesToDelete;
                    _a.label = 2;
                case 2:
                    if (!(_i < logFilesToDelete_1.length)) return [3 /*break*/, 9];
                    logFilePath_1 = logFilesToDelete_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 7, , 8]);
                    if (!(logFilePath_1 && fs.existsSync(logFilePath_1))) return [3 /*break*/, 5];
                    return [4 /*yield*/, fs.promises.unlink(logFilePath_1)];
                case 4:
                    _a.sent();
                    console.log("Deleted log file with checksum error: ".concat(logFilePath_1));
                    return [3 /*break*/, 6];
                case 5:
                    console.log("Log file not found: ".concat(logFilePath_1));
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error("Failed to delete log file ".concat(logFilePath_1, ": ").concat(error_1));
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 2];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Function to run the PowerShell script with the directory path as an argument
function runPowerShellScript(directoryPath) {
    return new Promise(function (resolve, reject) {
        console.log("Running PowerShell script to reprocess logs in directory: ".concat(directoryPath));
        (0, child_process_1.exec)("powershell -ExecutionPolicy Bypass -File \"".concat(powershellScriptPath, "\" -directoryPath \"").concat(directoryPath, "\""), function (error, stdout, stderr) {
            if (error) {
                console.error("Error executing PowerShell script: ".concat(error.message));
                reject(error);
                return;
            }
            if (stderr) {
                console.error("PowerShell stderr: ".concat(stderr));
            }
            console.log("PowerShell stdout: ".concat(stdout));
            resolve();
        });
    });
}
// Main function to delete checksum error log files and re-run PowerShell script
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, deleteChecksumErrorLogs()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, runPowerShellScript(gamesDirectory)];
                case 2:
                    _a.sent();
                    console.log("Process complete: Deleted checksum error log files and reloaded logs.");
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error("An error occurred during processing:", error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Run the main function
main();

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Paths
const logFilePath = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/unexpected_end_games.log';
//const gamesDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games';
const gamesDirectory = 'C:/Games/Worms Armageddon v3.7.2.1/User/Games/';
const powershellScriptPath = 'C:/TestGames/temp/extractWAGAMlog.ps1';


// Function to delete log files corresponding to checksum errors
async function deleteChecksumErrorLogs() {
    console.log("Reading unexpected_end_games.log to find files with checksum errors...");

    // Read the unexpected end log file
    const data = await fs.promises.readFile(logFilePath, 'utf8');
    console.log("Log file contents:\n", data);

    // Find lines with "Checksum Error"
    const lines = data.split('\n').filter(line => line.includes('Checksum Error'));
    console.log(`Found ${lines.length} lines with "Checksum Error"`);

    // Extract log file paths with checksum errors
    const logFilesToDelete = lines.map(line => {
        // Find the .log file path within the line
        const match = line.match(/(C:\\.*?\.log)/);
        if (match) {
            console.log(`Identified log file to delete: ${match[0]}`);
        }
        return match ? match[0] : null;
    }).filter(Boolean);

    // Delete each log file with checksum error
    for (const logFilePath of logFilesToDelete) {
        try {
            if (logFilePath && fs.existsSync(logFilePath)) {
                await fs.promises.unlink(logFilePath);
                console.log(`Deleted log file with checksum error: ${logFilePath}`);
            } else {
                console.log(`Log file not found: ${logFilePath}`);
            }
        } catch (error) {
            console.error(`Failed to delete log file ${logFilePath}: ${error}`);
        }
    }
}

// Function to run the PowerShell script with the directory path as an argument
function runPowerShellScript(directoryPath: string) {
    return new Promise<void>((resolve, reject) => {
        console.log(`Running PowerShell script to reprocess logs in directory: ${directoryPath}`);
        exec(`powershell -ExecutionPolicy Bypass -File "${powershellScriptPath}" -directoryPath "${directoryPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing PowerShell script: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`PowerShell stderr: ${stderr}`);
            }
            console.log(`PowerShell stdout: ${stdout}`);
            resolve();
        });
    });
}

// Main function to delete checksum error log files and re-run PowerShell script
async function main() {
    try {
        await deleteChecksumErrorLogs();
        await runPowerShellScript(gamesDirectory);
        console.log("Process complete: Deleted checksum error log files and reloaded logs.");
    } catch (error) {
        console.error("An error occurred during processing:", error);
    }
}

// Run the main function
main();

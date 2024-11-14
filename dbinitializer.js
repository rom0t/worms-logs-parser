"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
var sqlite3 = require("sqlite3");
var path = require("path");
var dbFilePath = path.join(__dirname, 'worms_stats_db.sqlite');
// Function to create the initial database structure
function initializeDatabase() {
    var db = new sqlite3.Database(dbFilePath, function (err) {
        if (err) {
            console.error("Error opening database:", err.message);
            return;
        }
        console.log("Connected to the SQLite database.");
    });
    db.serialize(function () {
        // Log progress
        console.log("Starting to create tables...");
        // Create players table
        db.run("\n            CREATE TABLE IF NOT EXISTS players (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                name TEXT NOT NULL UNIQUE\n            )\n        ", function (err) {
            if (err) {
                console.error("Error creating players table:", err.message);
            }
            else {
                console.log("Players table created successfully.");
            }
        });
        // Create weapons table
        db.run("\n            CREATE TABLE IF NOT EXISTS weapons (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                name TEXT NOT NULL UNIQUE\n            )\n        ", function (err) {
            if (err) {
                console.error("Error creating weapons table:", err.message);
            }
            else {
                console.log("Weapons table created successfully.");
            }
        });
        // Create games table
        db.run("\n            CREATE TABLE IF NOT EXISTS games (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                game_date TEXT NOT NULL,\n                game_type TEXT NOT NULL,\n                log_file_name TEXT NOT NULL\n            )\n        ", function (err) {
            if (err) {
                console.error("Error creating games table:", err.message);
            }
            else {
                console.log("Games table created successfully.");
            }
        });
        // Create player_aliases table without game_id
        db.run("\n            CREATE TABLE IF NOT EXISTS player_aliases (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                alias TEXT NOT NULL,\n                player_id INTEGER,\n                FOREIGN KEY(player_id) REFERENCES players(id)\n            )\n        ", function (err) {
            if (err) {
                console.error("Error creating player_aliases table:", err.message);
            }
            else {
                console.log("Player aliases table created successfully.");
            }
        });
        // Create damage_logs table
        db.run("\n           CREATE TABLE IF NOT EXISTS damage_logs (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            game_id INTEGER NOT NULL,\n            player_id INTEGER NOT NULL,\n            weapon_id INTEGER NOT NULL,\n            damage INTEGER NOT NULL,\n            turn_id INTEGER NOT NULL,\n            victim_id INTEGER NOT NULL,\n            FOREIGN KEY(game_id) REFERENCES games(id),\n            FOREIGN KEY(player_id) REFERENCES players(id),\n            FOREIGN KEY(weapon_id) REFERENCES weapons(id),\n            FOREIGN KEY(turn_id) REFERENCES turns(id),\n            FOREIGN KEY(victim_id) REFERENCES players(id)\n         );\n\n        ", function (err) {
            if (err) {
                console.error("Error creating damage_logs table:", err.message);
            }
            else {
                console.log("Damage logs table created successfully.");
            }
        });
        // Create turns table
        db.run("\n            CREATE TABLE IF NOT EXISTS turns (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                game_id INTEGER,\n                player_id INTEGER,\n                turn_number INTEGER NOT NULL,\n                FOREIGN KEY(game_id) REFERENCES games(id),\n                FOREIGN KEY(player_id) REFERENCES players(id)\n            )\n        ", function (err) {
            if (err) {
                console.error("Error creating turns table:", err.message);
            }
            else {
                console.log("Turns table created successfully.");
            }
        });
        console.log("Database structure creation process completed.");
    });
    db.close(function (err) {
        if (err) {
            console.error("Error closing the database:", err.message);
        }
        else {
            console.log("Database connection closed.");
        }
    });
}
// Call the function to initialize the database
initializeDatabase();

import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const dbFilePath = path.join(__dirname, 'worms_stats_db.sqlite');


// Function to create the initial database structure
export function initializeDatabase(): void {
    const db = new sqlite3.Database(dbFilePath, (err) => {
        if (err) {
            console.error("Error opening database:", err.message);
            return;
        }
        console.log("Connected to the SQLite database.");
    });

    db.serialize(() => {
        // Log progress
        console.log("Starting to create tables...");

        // Create players table
        db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        `, (err) => {
            if (err) {
                console.error("Error creating players table:", err.message);
            } else {
                console.log("Players table created successfully.");
            }
        });

        // Create weapons table
        db.run(`
            CREATE TABLE IF NOT EXISTS weapons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        `, (err) => {
            if (err) {
                console.error("Error creating weapons table:", err.message);
            } else {
                console.log("Weapons table created successfully.");
            }
        });

        // Create games table
        db.run(`
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_date TEXT NOT NULL,
                game_type TEXT NOT NULL,
                log_file_name TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error("Error creating games table:", err.message);
            } else {
                console.log("Games table created successfully.");
            }
        });

        // Create player_aliases table without game_id
        db.run(`
            CREATE TABLE IF NOT EXISTS player_aliases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alias TEXT NOT NULL,
                player_id INTEGER,
                FOREIGN KEY(player_id) REFERENCES players(id)
            )
        `, (err) => {
            if (err) {
                console.error("Error creating player_aliases table:", err.message);
            } else {
                console.log("Player aliases table created successfully.");
            }
        });

        // Create damage_logs table
        db.run(`
           CREATE TABLE IF NOT EXISTS damage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            weapon_id INTEGER NOT NULL,
            damage INTEGER NOT NULL,
            turn_id INTEGER NOT NULL,
            victim_id INTEGER NOT NULL,
            FOREIGN KEY(game_id) REFERENCES games(id),
            FOREIGN KEY(player_id) REFERENCES players(id),
            FOREIGN KEY(weapon_id) REFERENCES weapons(id),
            FOREIGN KEY(turn_id) REFERENCES turns(id),
            FOREIGN KEY(victim_id) REFERENCES players(id)
         );

        `, (err) => {
            if (err) {
                console.error("Error creating damage_logs table:", err.message);
            } else {
                console.log("Damage logs table created successfully.");
            }
        });

        // Create turns table
        db.run(`
            CREATE TABLE IF NOT EXISTS turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER,
                player_id INTEGER,
                turn_number INTEGER NOT NULL,
                FOREIGN KEY(game_id) REFERENCES games(id),
                FOREIGN KEY(player_id) REFERENCES players(id)
            )
        `, (err) => {
            if (err) {
                console.error("Error creating turns table:", err.message);
            } else {
                console.log("Turns table created successfully.");
            }
        });

        console.log("Database structure creation process completed.");
    });

    db.close((err) => {
        if (err) {
            console.error("Error closing the database:", err.message);
        } else {
            console.log("Database connection closed.");
        }
    });
}

// Call the function to initialize the database
initializeDatabase();

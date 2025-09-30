import { exec } from "child_process"

// Retrieve environment variables
const pgPassword = process.env.PG_PASSWORD;
const pgUsername = process.env.PG_USERNAME;
const pgDatabase = process.env.PG_DATABASE;
const pgHost = process.env.PG_HOST;
const pgPort = process.env.PG_PORT;

// Construct the pg_dump command
const command = `pg_dump -U ${pgUsername} -d ${pgDatabase} -h ${pgHost} -p ${pgPort} -f database-backup.pgsql`;

const backup = async () => {
    // Execute the command
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error during backup: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Standard error: ${stderr}`);
            return;
        }
        console.log('Database backup completed successfully.');
    });
}

export default backup;

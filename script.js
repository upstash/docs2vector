import Docs2Vector from './lib/Docs2Vector.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    try {
        // Step 1: Define the GitHub repository URL
        const githubRepoUrl = 'https://github.com/upstash/docs2vector';

        // Print start message
        console.log(`Starting processing for the repository: ${githubRepoUrl}`);

        // Step 2: Initialize the Docs2Vector SDK
        const converter = new Docs2Vector();

        // Step 3: Run the processing flow with Docs2Vector's `run` method
        await converter.run(githubRepoUrl);

        // Print success message
        console.log(`Successfully processed repository: ${githubRepoUrl}`);
        console.log('Vectors stored in Upstash Vector database.');
    } catch (error) {
        console.error('An error occurred while processing the repository:', error.message);
    }
}

main();
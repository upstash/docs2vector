import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Index } from '@upstash/vector';
import { promises as fs } from 'fs';
import path from 'path';
import { simpleGit } from 'simple-git';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize clients
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Initialize OpenAI embeddings if API key is provided
const useOpenAI = !!process.env.OPENAI_API_KEY;
let embeddings;
if (useOpenAI) {
    embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
    });
}

// Initialize Upstash Vector index
const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
});

// Generate a unique ID for each chunk
function generateId(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

async function cloneRepository(repoUrl) {
    const tempDir = path.join(process.cwd(), 'temp_repo');

    // Clean up existing temp directory if it exists
    try {
        await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
        // Directory might not exist, continue
    }

    // Clone the repository
    const git = simpleGit();
    await git.clone(repoUrl, tempDir);

    return tempDir;
}

async function findMarkdownFiles(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    let markdownFiles = [];

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory() && !file.name.startsWith('.')) {
            const subDirFiles = await findMarkdownFiles(fullPath);
            markdownFiles = [...markdownFiles, ...subDirFiles];
        } else if (file.name.match(/\.(md|mdx)$/)) {
            markdownFiles.push(fullPath);
        }
    }

    return markdownFiles;
}

async function processFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);

    // Create a Document object and split it into chunks
    const doc = new Document({ pageContent: content });
    const chunks = await textSplitter.splitDocuments([doc]);

    // Convert chunks to Upstash Vector format
    const processedChunks = await Promise.all(chunks.map(async chunk => {
        const base = {
            id: generateId(chunk.pageContent),
            metadata: {
                fileName: path.basename(filePath),
                filePath: relativePath,
                fileType: path.extname(filePath).substring(1),
                timestamp: new Date().getTime()
            }
        };

        if (useOpenAI) {
            // Generate embeddings using OpenAI
            const [vector] = await embeddings.embedDocuments([chunk.pageContent]);
            return {
                ...base,
                vector,
                data: chunk.pageContent
            };
        } else {
            // Use Upstash's built-in embeddings
            return {
                ...base,
                data: chunk.pageContent
            };
        }
    }));

    return processedChunks;
}

async function main() {
    try {
        // Get repository URL from command line arguments
        const repoUrl = process.argv[2];
        if (!repoUrl) {
            throw new Error('Please provide a repository URL as an argument');
        }

        console.log(`Processing repository: ${repoUrl}`);
        console.log(`Using ${useOpenAI ? 'OpenAI' : 'Upstash'} embeddings`);

        // Create namespace for this repository
        const repoName = repoUrl.split('/').pop().replace('.git', '');
        console.log(`Using namespace: ${repoName}`);

        // Clone the repository
        const repoDir = await cloneRepository(repoUrl);
        console.log('Repository cloned successfully');

        // Find all markdown files
        const markdownFiles = await findMarkdownFiles(repoDir);
        console.log(`Found ${markdownFiles.length} markdown files`);

        // Process each file
        let allChunks = [];
        for (const file of markdownFiles) {
            console.log(`Processing file: ${file}`);
            const chunks = await processFile(file);
            allChunks = [...allChunks, ...chunks];
        }

        // Store chunks in Upstash Vector
        console.log(`Storing ${allChunks.length} chunks in Upstash Vector`);

        // Use batching to avoid rate limits
        const batchSize = 100;
        for (let i = 0; i < allChunks.length; i += batchSize) {
            const batch = allChunks.slice(i, i + batchSize);
            await index.upsert(batch, { namespace: repoName });
            console.log(`Processed batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(allChunks.length/batchSize)}`);
        }

        // Clean up
        await fs.rm(repoDir, { recursive: true, force: true });
        console.log('Processing completed successfully');

        // Print some information about the index
        const info = await index.info();
        console.log('Index information:', info);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
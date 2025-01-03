// Import required dependencies
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { UpstashVectorStore } from '@langchain/community/vectorstores/upstash';
import { OpenAIEmbeddings } from '@langchain/openai';
import fs from 'fs/promises';
import path from 'path';
import { simpleGit } from 'simple-git';

// Load environment variables
dotenv.config();

// Initialize clients
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
});

const vectorStore = new UpstashVectorStore(embeddings, {
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN
});

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
});

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

    // Split the content into chunks
    const chunks = await textSplitter.createDocuments([content], [{ source: relativePath }]);

    // Add metadata to each chunk
    const processedChunks = chunks.map(chunk => ({
        ...chunk,
        metadata: {
            ...chunk.metadata,
            fileName: path.basename(filePath),
            fileType: path.extname(filePath).substring(1)
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
        await vectorStore.addDocuments(allChunks);

        // Clean up
        await fs.rm(repoDir, { recursive: true, force: true });
        console.log('Processing completed successfully');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
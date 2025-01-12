import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Index } from "@upstash/vector";
import { promises as fs } from 'fs';
import path from 'path';
import { simpleGit } from 'simple-git';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config();

class Docs2Vector {
    constructor() {
        // Load parameters from environment variables
        this.vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
        this.vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
        this.openAiApiKey = process.env.OPENAI_API_KEY;
        this.githubToken = process.env.GITHUB_TOKEN;
        this.namespace = "";

        // Initialize Upstash Vector
        this.index = new Index({
            url: this.vectorUrl,
            token: this.vectorToken
        });

        // Optionally initialize OpenAI embeddings
        if (this.openAiApiKey) {
            this.embeddings = new OpenAIEmbeddings({
                openAIApiKey: this.openAiApiKey
            });
        }

        // Optionally initialize GitHub API client
        if (this.githubToken) {
            this.octokit = new Octokit({
                auth: this.githubToken
            });
        }

        // Initialize text splitter
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", " ", ""]
        });
    }

    // Private helper: Generate a unique ID for content chunks
    static #generateId(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    // Private method: Clone GitHub repository
    async #cloneRepository(repoUrl) {
        const tempDir = path.join(process.cwd(), 'temp_repo');

        // Clean up temporary directory if it exists
        await fs.rm(tempDir, { recursive: true, force: true });

        // Clone the repository
        const git = simpleGit();
        await git.clone(repoUrl, tempDir);

        return tempDir;
    }

    // Private method: Find all markdown files in a directory
    async #findMarkdownFiles(dir) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        let markdownFiles = [];

        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.isDirectory() && !file.name.startsWith('.')) {
                const subFiles = await this.#findMarkdownFiles(fullPath);
                markdownFiles = [...markdownFiles, ...subFiles];
            } else if (file.name.match(/\.(md|mdx)$/)) {
                markdownFiles.push(fullPath);
            }
        }

        return markdownFiles;
    }

    // Private method: Process a single markdown file
    async #processFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);

        const doc = new Document({ pageContent: content });
        const chunks = await this.textSplitter.splitDocuments([doc]);

        // Create processed chunks
        const processedChunks = await Promise.all(chunks.map(async chunk => {
            const base = {
                id: Docs2Vector.#generateId(chunk.pageContent),
                metadata: {
                    fileName: path.basename(filePath),
                    filePath: relativePath,
                    fileType: path.extname(filePath).substring(1),
                    timestamp: new Date().getTime()
                }
            };

            if (this.embeddings) {
                // Generate embeddings via OpenAI
                const [vector] = await this.embeddings.embedDocuments([chunk.pageContent]);
                return { ...base, vector, data: chunk.pageContent };
            } else {
                // Data-only format for Upstash Vector
                return { ...base, data: chunk.pageContent };
            }
        }));

        return processedChunks;
    }

    // Public method: Main run logic
    async run(repoUrl) {
        try {
            console.log(`Processing repository: ${repoUrl}`);
            this.namespace = repoUrl.split('/').pop().replace('.git', '');
            console.log(`Using namespace: ${this.namespace}`);

            // Clone repository
            const repoDir = await this.#cloneRepository(repoUrl);

            // Find markdown files
            const markdownFiles = await this.#findMarkdownFiles(repoDir);
            console.log(`Found ${markdownFiles.length} markdown files`);

            // Process markdown files
            let allChunks = [];
            for (const file of markdownFiles) {
                console.log(`Processing file: ${file}`);
                const chunks = await this.#processFile(file);
                allChunks = [...allChunks, ...chunks];
            }

            // Store embeddings in Upstash Vector
            console.log(`Storing ${allChunks.length} chunks in Upstash Vector`);
            const batchSize = 100;
            for (let i = 0; i < allChunks.length; i += batchSize) {
                const batch = allChunks.slice(i, i + batchSize);
                await this.index.upsert(batch, { namespace: this.namespace });
                console.log(`Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allChunks.length / batchSize)}`);
            }

            // Clean up cloned repository
            await fs.rm(repoDir, { recursive: true, force: true });
            console.log('Processing completed successfully');
        } catch (error) {
            console.error('Error:', error.message);
            throw error;
        }
    }
}

export default Docs2Vector;
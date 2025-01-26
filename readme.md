# GitHub Docs Vectorizer

This tool processes Markdown files of you GitHub documentation repo, and insert them into Upstash Vector database. So you can build document search systems, AI-driven documentation assistants, or knowledge bases.

## Features
- Recursively find all Markdown (`.md`) and MDX (`.mdx`) files in any GitHub repository
- Chunk documents using LangChain's RecursiveCharacterTextSplitter
- Supports both OpenAI and Upstash embeddings
- Stores document chunks and metadata in Upstash Vector for semantic retrieval

## Prerequisites
- Node.js (v16 or higher)
- GitHub personal access token (required for repository access)
- Upstash Vector database account (to store vectors)
- OpenAI API key (optional, for generating embeddings)

## How to Find Your GitHub Token

<details>
<summary>Click to expand instructions for getting your GitHub token</summary>

1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Click on your profile picture in the top-right corner
3. Go to `Settings` > `Developer settings` > `Personal access tokens` > `Tokens (classic)`
4. Click `Generate new token` > `Generate new token (classic)`
5. Give your token a descriptive name in the "Note" field
6. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read organization data)
7. Click `Generate token`
</details>

## Installation Guide

1. Clone the repository or create a new directory:
```bash
mkdir github-docs-vectorizer
cd github-docs-vectorizer
```

2. Ensure the following files are included in your directory:
   - `script.js`: The main script for processing
   - `package.json`: Manages project dependencies
   - `.env`: Contains your environment variables (explained below)

3. Install dependencies:
```bash
npm install
```

4. Set up a `.env` file in the root directory of your project with your credentials:
```env
# Required for accessing GitHub repositories
GITHUB_TOKEN=your_github_token

# Required for storing vectors in Upstash
UPSTASH_VECTOR_REST_URL=your_upstash_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token

# Optional: Provide if using OpenAI embeddings
OPENAI_API_KEY=your_openai_api_key
```

## Usage

Run the script by providing the GitHub repository URL as an argument:

```bash
node script.js https://github.com/username/repository
```

Example:
```bash
node script.js https://github.com/facebook/react
```

The script will:
1. Clone the specified repository
2. Find all Markdown files
3. Split content into chunks
4. Generate embeddings (using either OpenAI or Upstash)
5. Store the chunks in your Upstash Vector database
6. Clean up temporary files

## Configuration

### Embedding Options

### Supported Embedding Providers

1. OpenAI Embeddings (default if API key is provided)
   - Requires `OPENAI_API_KEY` in `.env`
   - Uses OpenAI's text-embedding-ada-002 model
   - You need to choose `custom` as embedding model while creating Vector Index

2. Upstash Embeddings (used when OpenAI API key is not provided)
   - No additional configuration needed
   - Uses Upstash's built-in embedding service
   - You need to choose an embedding model while creating Vector Index 

### Customizing Document Chunking

To adjust how documents are split into chunks, you can update the configuration in `script.js`:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,    // Adjust chunk size as needed
  chunkOverlap: 200   // Adjust overlap as needed
});
```

## SDK

Use the SDK to trigger the functionality programmatically.

```shell
npm install @upstash/docs2vector dotenv
```

```javascript
import dotenv from 'dotenv';
import Docs2Vector from "@upstash/docs2vector";

// Load environment variables
dotenv.config();

async function main() {
    console.time('Processing Time');
    try {
        // Step 1: Define the GitHub repository URL
        const githubRepoUrl = 'YOUR_GITHUB_URL';

        // Print start message
        console.log(`Starting processing for the repository: ${githubRepoUrl}`);

        // Step 2: Initialize the Docs2Vector SDK
        const converter = new Docs2Vector();

        // Step 3: Run the processing flow with Docs2Vector's `run` method
        await converter.run(githubRepoUrl);

        // Print success message
        console.log(`Successfully processed repository: ${githubRepoUrl}`);
        console.log('Vectors stored in Upstash Vector database.');
        console.timeEnd('Processing Time');
    } catch (error) {
        console.timeEnd('Processing Time');
        console.error('An error occurred while processing the repository:', error.message);
    }
}

main();
```


## Metadata

Metadata accompanies each stored chunk for improved context:
- Original file name
- File type (Markdown or MDX)
- Relative file path in the repository
- Document source for the specific chunk of text

## Error Handling
The script is designed to handle errors gracefully in the following cases:
- Invalid repository URLs provided
- Missing or incorrect credentials
- Unable to access or read the required files
- Connectivity or network-related problems
- Network problems

In case of errors, the script will:
1. Log the error message
2. Clean up any temporary files
3. Exit with a non-zero status code

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this tool for any purpose.

## Credits

This tool uses the following open-source packages:
- **LangChain**: Handles document processing and vector store integration
- **Octokit**: Facilitates interactions with the GitHub API
- **simple-git**: Manages operations on Git repositories
- **Upstash Vector**: Enables seamless storage and retrieval of document vectors

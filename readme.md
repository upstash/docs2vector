# GitHub Docs Vectorizer

A Node.js tool that automatically processes Markdown files from any GitHub repository and stores them in Upstash Vector database for efficient similarity search and retrieval. This tool is particularly useful for creating document search systems, knowledge bases, or AI-powered documentation assistants.

## Features

- Clones any GitHub repository
- Recursively finds all Markdown (`.md`) and MDX (`.mdx`) files
- Chunks documents using LangChain's text splitter for optimal processing
- Supports both OpenAI and Upstash embeddings
- Stores document chunks with metadata in Upstash Vector
- Handles cleanup automatically
- Preserves file metadata for better context during retrieval

## Prerequisites

- Node.js (v16 or higher)
- NPM or Yarn
- GitHub access token (for repository access)
- Upstash Vector database account
- (Optional) OpenAI API key

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
8. Copy the token.

</details>

## Installation

1. Clone this repository or create a new directory:
```bash
mkdir github-docs-vectorizer
cd github-docs-vectorizer
```

2. Copy the provided files:
   - `script.js`: Main processing script
   - `package.json`: Dependencies configuration

3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file in the root directory with your credentials:
```env
GITHUB_TOKEN=your_github_token
UPSTASH_VECTOR_REST_URL=your_upstash_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token
OPENAI_API_KEY=your_openai_api_key  # Optional - if not provided, will use Upstash embeddings
```

## Usage

Run the script with a GitHub repository URL as an argument:

```bash
node script.js https://github.com/username/repository
```

For example:
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

The tool supports two embedding providers:

1. OpenAI Embeddings (default if API key is provided)
   - Requires `OPENAI_API_KEY` in `.env`
   - Uses OpenAI's text-embedding-ada-002 model
   - Choose 1536 as dimension while creating vector index

2. Upstash Embeddings (used when OpenAI API key is NOT provided)
   - No additional configuration needed
   - Uses Upstash's built-in embedding service

### Chunking Configuration

You can modify the text splitting configuration in `script.js`:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,    // Adjust chunk size as needed
  chunkOverlap: 200   // Adjust overlap as needed
});
```

## Metadata

Each stored chunk includes the following metadata:
- Source file name
- File type (md/mdx)
- Relative path in the repository
- Original chunk location

## Error Handling

The script includes error handling for common scenarios:
- Invalid repository URLs
- Missing credentials
- File access issues
- Network problems

If any error occurs, the script will:
1. Log the error message
2. Clean up any temporary files
3. Exit with a non-zero status code

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this tool for any purpose.


This tool uses the following open-source packages:
- LangChain: Document processing and vector store integration
- Octokit: GitHub API interactions
- simple-git: Git repository operations
- Upstash Vector: Vector database storage

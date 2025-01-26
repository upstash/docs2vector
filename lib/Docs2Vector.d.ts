declare class Docs2Vector {
    private vectorUrl: string;
    private vectorToken: string;
    private openAiApiKey: string;
    private githubToken: string;
    private namespace: string;
    private index: any;
    private embeddings: any;
    private octokit: any;
    private textSplitter: any;

    constructor();
    init(): Promise<void>;
    reindex(): Promise<void>;
    search(query: string, limit?: number): Promise<any[]>;
    addDocument(content: string, metadata: any): Promise<void>;

    private static generateId(content: string): string;
    private cloneRepository(repoUrl: string): Promise<string>;
    private findMarkdownFiles(dir: string): Promise<string[]>;
    private processFile(filePath: string): Promise<Array<{
        id: string;
        metadata: {
            fileName: string;
            filePath: string;
            fileType: string;
            timestamp: number;
        };
        vector?: number[];
        data: string;
    }>>;

    run(repoUrl: string): Promise<void>;
}

export default Docs2Vector;

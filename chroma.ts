import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

interface Person {
  id: string;
  name: string;
  bio: string;
}

(async () => {
  // 1. Define test data: an array of personal details.
  const personalData: Person[] = [
    { id: '1', name: 'John Doe', bio: 'John is a software engineer with 10 years of experience.' },
    { id: '2', name: 'Jane Smith', bio: 'Jane is a graphic designer passionate about art.' },
    { id: '3', name: 'Alice Johnson', bio: 'Alice is a data scientist working on machine learning projects.' }
  ];

  // 2. Initialize the transformer pipeline using a free embedding model.
  // Here we use the 'all-MiniLM-L6-v2' model from Xenova.
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Helper function to get a single embedding vector from a text.
  // Note: The model returns an array of token vectors. For simplicity, we'll average them.
  const getEmbedding = async (text: string): Promise<number[]> => {
    const result: number[][] = (await embedder(text)).data as number[][];
    const tokenCount = result.length;
    const vectorLength = result[0].length;
    const avgEmbedding: number[] = Array(vectorLength).fill(0);
    for (const tokenVec of result) {
      for (let i = 0; i < vectorLength; i++) {
        avgEmbedding[i] += tokenVec[i];
      }
    }
    return avgEmbedding.map((v) => v / tokenCount);
  };

  // Compute embeddings for each personal detail's bio.
  const embeddings: number[][] = [];
  for (const person of personalData) {
    const emb = await getEmbedding(person.bio);
    embeddings.push(emb);
  }

  // 3. Set up the Chroma DB collection.
  // This creates a new collection (think of it as a table) named 'personal_details'
  const client = new ChromaClient();
  const collection = await client.createCollection({ name: 'personal_details' });

  // Insert each personal detail along with its vector embedding and metadata.
  for (let i = 0; i < personalData.length; i++) {
    await collection.add({
      ids: [personalData[i].id],
      embeddings: [embeddings[i]],
      metadatas: [{ name: personalData[i].name, bio: personalData[i].bio }]
    });
  }

  // 4. Perform a vector search.
  // For example, search for the query "who is john" by first vectorizing the query text.
  // const queryText: string = "who is john";
  // const queryEmbedding: number[] = await getEmbedding(queryText);
  // const searchResults = await collection.query({
  //   queryEmbeddings: [queryEmbedding],
  //   nResults: 1, // Retrieve the top matching document
  // });

  // console.log('Search Results:', searchResults);
})();

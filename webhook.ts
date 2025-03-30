import { RequestHandler } from 'express';
import env from '../util/validateEnv';
import { messagesCheck, nfmReplyCheck, textMesssgeCheck } from '../util/messageValidation';
import { shouldProcessMessage } from '../util/messageUtils';
import { checkUserActiveStatus } from '../util/db/dbHandler';
import { handleActiveUserFlow, handleInactiveUserFlow } from '../services/userFlowHandler';
import { handleListReply } from './listReply';
import { handleButtonReply } from './buttonReply';
import { memoryManager } from '../routes/memoryManager';
import { COMMON_KEYS, SESSION_KEYS } from '../constants/memoryKeys';
import { ChromaClient } from 'chromadb';

const verify_token = env.VERIFY_TOKEN;

/**
 * 1) Webhook setup confirmation
 */
export const checkWebhook: RequestHandler = async (req, res) => {
  res.status(200).send("Hello! This is a webhook setup!");
};

/**
 * 2) Verify the callback URL
 */
export const verifyWebhook: RequestHandler = async (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      // If verify token is correct, return the challenge.
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }
  return res.status(400).send("Bad Request");
};

/**
 * Helper function to perform vector search using a free transformer model.
 * Uses a dynamic import to load the ES module.
 */
async function performVectorSearch(query: string) {
  // Dynamically import the pipeline function from @xenova/transformers.
  const { pipeline } = await import('@xenova/transformers');
  
  // Initialize the transformer pipeline using Xenova's free model.
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Helper to compute the average embedding for the given text.
  const getEmbedding = async (text: string): Promise<number[]> => {
    const result: any = await embedder(text);
    const tokenVectors: number[][] = result.data as number[][];
    const tokenCount = tokenVectors.length;
    const vectorLength = tokenVectors[0].length;
    const avgEmbedding: number[] = Array(vectorLength).fill(0);
    for (const tokenVec of tokenVectors) {
      for (let i = 0; i < vectorLength; i++) {
        avgEmbedding[i] += tokenVec[i];
      }
    }
    return avgEmbedding.map((v) => v / tokenCount);
  };

  // Compute the embedding for the query text.
  const queryEmbedding = await getEmbedding(query);

  // Initialize the Chroma client and get (or create) the collection.
  const client = new ChromaClient();
  const collection = await client.createCollection({ name: 'personal_details' });

  // Perform the vector query.
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 1
  });
  return results;
}

/**
 * 3) Main webhook listener.
 */
export const listenWebhook: RequestHandler = async (req, res) => {
  console.log("# Listening Webhook event #");

  const body_param = req.body;
  if (!body_param.object) {
    return res.sendStatus(404);
  }

  if (!messagesCheck(body_param)) {
    return res.sendStatus(404);
  }

  console.log("# Message Event #");

  const messageData = body_param.entry[0].changes[0].value.messages[0];
  const messageContact = body_param.entry[0].changes[0].value.contacts[0];
  const phone_no = messageData.from;
  const messageId = messageData.id;
  const profileName = messageContact.profile?.name || "there";
  const phoneNumberId = body_param.entry[0].changes[0].value.metadata.phone_number_id;
console.log('phoneNumberId:', phoneNumberId);

  // console.log('body_param:', JSON.stringify(body_param, null, 2));

  // Use textMesssgeCheck to verify the message is text and to safely extract the text body.
  if (textMesssgeCheck(body_param)) {
    const messageText = messageData.text.body;
    
    // If the message is "hi", set up user state.
    if (messageText.toLowerCase() === "hi") {
      await memoryManager.delete(phone_no, SESSION_KEYS.LAST_LIST_TYPE);
      await memoryManager.set(phone_no, COMMON_KEYS.GREETING, true);
    }

    // If the message is "who is john", execute the vector search.
    if (messageText.toLowerCase() === "who is john") {
      console.log("Performing vector search for 'who is john' query");
      try {
        const vectorSearchResults = await performVectorSearch("who is john");
        console.log("Vector search results:", vectorSearchResults);
        return res.status(200).json(vectorSearchResults);
      } catch (error) {
        console.error("Error during vector search:", error);
        return res.sendStatus(500);
      }
    }
  }

  const listType = await memoryManager.get(phone_no, SESSION_KEYS.LAST_LIST_TYPE);
    
  if (nfmReplyCheck(body_param)) {
    console.log("List Type:", listType);

    const responseJsonString = body_param?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.nfm_reply?.response_json;

if (responseJsonString) {
  try {
    const parsed = JSON.parse(responseJsonString);
    console.log('Parsed response_json:', parsed);

  } catch (err) {
    console.error('Error parsing response_json:', err);
  }
}
    
  }

  const processAllowed = await shouldProcessMessage(phone_no, messageId, messageData.timestamp, res);
  if (!processAllowed) return;

  const isActive = await checkUserActiveStatus(phone_no);
  if (isActive) {
    
    if (!listType) {
      await handleActiveUserFlow(body_param, phone_no, profileName);
      return res.sendStatus(200);
    }
  } else {
    await handleInactiveUserFlow(body_param, phone_no, profileName);
  }

  if (await handleListReply(body_param, phone_no)) {
    return res.sendStatus(200);
  }

  if (await handleButtonReply(body_param, phone_no)) {
    return res.sendStatus(200);
  }

  return res.sendStatus(200);
};

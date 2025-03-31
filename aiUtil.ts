import Groq from 'groq-sdk';
import env from "../util/validateEnv";

const client = new Groq({
  apiKey: env.MISTRAL_API_KEY,
});

// Function to get Groq chat response with a specific knowledge base
export async function getAIConextChanges(messageContent: string, knowledgeBase: Record<string, any>): Promise<any> {
  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an assistant that only answers questions based on the following information:, you can update the knowledgeBase 
           ${JSON.stringify(knowledgeBase)}. And return ONLY JSON of the knowledgeBase with the same stucture but updated values. Dates MUST be in this format DD/MM/YYYY
           NEVER RETURN  province: as '{' ''. Do not provide any information that not in the knowledgeBase JSON result MUST be in the structure of knowledgeBase JSON`,
        },
        { role: 'user', content: messageContent },
      ],
      model: 'llama3-8b-8192',
    });

    return { content: chatCompletion.choices[0].message.content };
  } catch (err) {
    console.error('An error occurred:', err);
    return { error: 'An error occurred while processing the request.' };
  }
}

export async function getAISentimentChanges(messageContent: string): Promise<any> {
  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an assistant specialized in determining the sentiment of questions. Classify the following 
                   question into one of the categories: Travel, Price, Greeting, or Unknown.

                   Instructions:
                   - Only classify questions directly related to travel plans, destinations, or transportation as "Travel".
                   - Classify questions about costs, fees, or payments as "Price".
                   - Classify general salutations or greetings (e.g., "Hello", "Good morning") as "Greeting".
                   - Classify questions that do not fit the above categories or are not clear as "Unknown".

                   Examples:
                   1. "How much does a ticket to Paris cost?" -> "Price"
                   2. "What are the best places to visit in Rome?" -> "Travel"
                   3. "Hi, how are you?" -> "Greeting"
                   4. "Can you tell me about John Paul?" -> "Unknown"
                   
                   JUST OUTPUT ONE OF THE WORDS travel, greeting, price, unknown`,
        },
        { role: 'user', content: messageContent },
      ],
      model: 'llama3-8b-8192',
    });

    return { content: chatCompletion.choices[0].message.content };
  } catch (err) {
    console.error('An error occurred:', err);
    return { error: 'An error occurred while processing the request.' };
  }
}


export function extractJsonFromContent(contentObj: any): object | null {
  try {
    // Ensure the input contains the 'content' field
    if (contentObj && contentObj.content) {
      const content = contentObj.content;
      
      // Extract the JSON part from the 'content' string
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          // Parse the extracted JSON string
          const pureJson = JSON.parse(jsonMatch[0]);
          return pureJson;
        } catch (jsonError) {
          console.error("Failed to parse extracted JSON:", jsonError);
          return null; // Return null if JSON parsing fails
        }
      } else {
        console.error("No JSON found in the content");
        return null;
      }
    } else {
      console.error("No 'content' field found");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while extracting JSON:", error);
    return null;
  }
}

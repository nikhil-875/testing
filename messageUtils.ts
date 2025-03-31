import { sendInteractiveMessage } from "../util/apiHandler";
import { transformButton, transformToBody } from "../util/transformUtils";
import { memoryManager } from '../routes/memoryManager'; // Ensure this is correctly imported
import { SESSION_KEYS } from '../constants/memoryKeys'; // Adjust the path as needed
/**
 * Sends an interactive message based on the sentiment response.
 * 
 * @param phone_no - The phone number to send the message to.
 * @param requestResponse - The sentiment response containing the message and buttons.
 */

const MESSAGE_AGE_THRESHOLD = 10 * 1000; // 10 seconds in milliseconds

export async function shouldProcessMessage(phone_no: string, messageId: string, messageTimestamp: string, res: any): Promise<boolean> {
    const timestampInMs = parseInt(messageTimestamp) * 1000; // Convert to milliseconds
    const currentTimestamp = Date.now();

    // Check if the message is too old
    if (currentTimestamp - timestampInMs > MESSAGE_AGE_THRESHOLD) {
        console.log("Old message detected, ignoring.");
        res.sendStatus(200); // Acknowledge the request without further processing
        return false;
    }

    // Check if the message has already been processed
    const lastMessageId = await memoryManager.get(phone_no, SESSION_KEYS.LAST_MESSAGE_ID);

    if (messageId === lastMessageId) {
        console.log("Duplicate message detected, ignoring.");
        res.sendStatus(200); // Acknowledge the request without further processing
        return false;
    }

    // If the message is valid and not a duplicate, update the last message ID
    await memoryManager.set(phone_no, SESSION_KEYS.LAST_MESSAGE_ID, messageId);
    return true;
}

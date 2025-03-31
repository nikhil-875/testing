import env from "../util/validateEnv";
import axios, { AxiosResponse } from "axios";
import { SENTIMENT_KEYS, SESSION_KEYS, USERS_KEYS } from "../constants/memoryKeys";
import { memoryManager } from "../routes/memoryManager";
import { generateRandomString } from "./stringUtils";
import { CTA_URL, ListBody, SingleList, TextMessageContent } from "../types/types";
import { isButtonReply, textCheck } from "./messageValidation";
import fetch from 'node-fetch';
import fs from "fs";
import path from "path";
const { TOKEN: token, VERSION: version, PHONE_NO_ID: phone_no_id } = env;

const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const sendMessage = async (to: string, payload: object, retryCount = 0): Promise<boolean> => {
  try {
    await axios.post(
      `https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`,
      payload,
      axiosConfig
    );
    // console.log(payload)
    return true;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error sending message:", error.response.data);
      if (error.response.status >= 500 && retryCount < 3) {
        // Retry for server-side errors, with a limit of 3 retries
        console.log(`Retrying... (${retryCount + 1})`);
        return await sendMessage(to, payload, retryCount + 1);
      }
    } else if (error instanceof Error) {
      console.error("Error sending message:", error.message);
    } else {
      console.error("Unknown error sending message:", error);
    }
    return false;
  }
};


export const sendTextMessages = async (to: string, msg: any): Promise<boolean> => {
  // console.error("# msg #", msg);
  let bodyContent = typeof msg === 'string' ? msg : JSON.stringify(msg);
  if (typeof msg === 'object' && msg.body) {
    bodyContent = msg.body.question || '';
  }
  if (!bodyContent) {
    console.error("Error: text body content is empty.");
    return false;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    text: {
      body: bodyContent, // Ensure body is a string and not empty
    },
  };
  
  return sendMessage(to, payload);
};

export const sendInteractiveMessage = async (to: string, body: any, buttons: any[]): Promise<boolean> => {
  let bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
  if (typeof body === 'object' && body.body) {
    bodyContent = body.body.question || '';
  }
  if (!bodyContent) {
    console.error("Error: interactive body content is empty.");
    return false;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyContent, // Ensure body is a string and not empty
      },
      action: {
        buttons,
      },
    },
  };
  return sendMessage(to, payload);
};

const callChatbotAPI = async (url: string, body: object): Promise<any> => {
  try {
    const response: AxiosResponse<any> = await axios.post(url, body, axiosConfig);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error occurred:", error.response.data);
    } else if (error instanceof Error) {
      console.error("Error occurred:", error.message);
    } else {
      console.error("Unknown error occurred:", error);
    }
    return null;
  }
};

export const getSentimentResponse = async (
  bodyParam: any,
  question: string,
  context: any
): Promise<{ sentiment: string; header: string; answer: string; buttons: any[]; data: any[]; footer: string }> => {
  const url = "https://onlinetransport-flask-4a508c1d6ba8.herokuapp.com/sentiment";
  let parsedBody: any;
  if (typeof bodyParam === "string") {
    try {
      parsedBody = JSON.parse(bodyParam);
    } catch (error) {
      console.error("Error parsing bodyParam:", error);
      return { sentiment: "", header: "", answer: "", buttons: [], data: [], footer: "" };
    }
  } else {
    parsedBody = bodyParam;
  }

  const extractedBody = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
  const phoneNo = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '';

  if (!phoneNo) {
    console.error("Error: phoneNo is empty.");
    return { sentiment: "", header: "", answer: "", buttons: [], data: [], footer: "" };
  }

  let sentiment = (await memoryManager.get(phoneNo, SENTIMENT_KEYS.SENTIMENT)) || '';
  let service = (await memoryManager.get(phoneNo, SENTIMENT_KEYS.SERVICE)) || '';
  let sessionId = (await memoryManager.get(phoneNo, USERS_KEYS.SESSION_ID)) || '';
  let keys = (await memoryManager.get(phoneNo, USERS_KEYS.KEY)) || '';
  let tokens = (await memoryManager.get(phoneNo, USERS_KEYS.TOKEN)) || '';

  const body = {
    question: extractedBody,
    sentiment: sentiment,
    contact: phoneNo,
    service: service,
    session: sessionId,
    key: keys,
    token: tokens,
    context,
  };

  // console.error("Sentiment Body: ", body);
  const responseData = await callChatbotAPI(url, body);
  if (responseData && responseData.answer) {
    const sentimentData = responseData.data || [];
    const sentimentButton = responseData.answer.button || []; // Ensure button extraction
    const transformedButtons: any[] = [];
    sentimentButton.forEach((item: any) => {
      transformedButtons.push({
        id: item.id,
        title: item.title
      });
    });

    return {
      sentiment: responseData.sentiment.toLowerCase(),
      header: responseData.answer.header,
      answer: responseData.answer.text,
      buttons: transformedButtons,
      data: sentimentData,
      footer: responseData.answer.footer
    };
  } else {
    return { sentiment: "", header: "", answer: "", buttons: [], data: [], footer: "" };
  }
};

export const callContextService = async (
  bodyParam: any,
  sentiment: string,
  data: any
): Promise<{ header: string; answer: string; buttons: any[]; data: any[]; footer: string }> => {
  const url = 'https://onlinetransport-flask-4a508c1d6ba8.herokuapp.com/context';
  let parsedBody: any;
  // console.log('data', data)
  // Parse bodyParam if it's a string
  if (typeof bodyParam === 'string') {
    try {
      parsedBody = JSON.parse(bodyParam);
    } catch (error) {
      console.error("Error parsing bodyParam:", error);
      return { header: "", answer: "Error parsing bodyParam", buttons: [], data: [], footer: "" };
    }
  } else {
    parsedBody = bodyParam;
  }

  // Extract the body from data if available, otherwise fallback to parsedBody
  const extractedBody = data?.extractedBody || parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
  const phoneNo = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '';

  // Validate phoneNo
  if (!phoneNo) {
    console.error("Error: phoneNo is empty.");
    return { header: "", answer: "Error extracting data", buttons: [], data: [], footer: "" };
  }

  // Retrieve stored session and service data
  let service = (await memoryManager.get(phoneNo, SENTIMENT_KEYS.SERVICE)) || '';
  let sessionId = (await memoryManager.get(phoneNo, USERS_KEYS.SESSION_ID)) || '';
  let keys = (await memoryManager.get(phoneNo, USERS_KEYS.KEY)) || '';
  let tokens = (await memoryManager.get(phoneNo, USERS_KEYS.TOKEN)) || '';

  // Generate sessionId if it doesn't exist
  if (!sessionId) {
    sessionId = generateRandomString(32);
    await memoryManager.set(phoneNo, USERS_KEYS.SESSION_ID, sessionId);
  }

  // Build the body for the API request
  const requestBody = {
    question: extractedBody,
    sentiment: sentiment,
    contact: phoneNo,
    service: service,
    session: sessionId,
    key: keys,
    token: tokens,
    context: data,
  };
  // console.error("#Context body#", JSON.stringify(requestBody, null, 2));
  // Call the chatbot API
  const responseData = await callChatbotAPI(url, requestBody);

  // Handle the response and transform buttons
  if (responseData && responseData.answer) {
    const contextData = responseData.data || [];
    const contextButton = responseData.answer.button || [];
    const transformedButtons: any[] = [];

    contextButton.forEach((item: any) => {
      transformedButtons.push({
        id: item.id,
        title: item.title
      });
    });

    return {
      header: responseData.answer.header,
      answer: responseData.answer.text,
      buttons: transformedButtons,
      data: contextData,
      footer: responseData.answer.footer
    };
  } else {
    return { header: "", answer: "Error occurred while calling API", buttons: [], data: [], footer: "" };
  }
};

export const getAskResponse = async (
  bodyParam: any,
  sentiment: string,
  context: any
): Promise<{ header: string; answer: string; buttons: any[]; data: any[]; footer: string }> => {
  const url = "https://onlinetransport-flask-4a508c1d6ba8.herokuapp.com/ask";
  let parsedBody: any;
  let extractedBody = '';
  if (typeof bodyParam === 'string') {
    try {
      parsedBody = JSON.parse(bodyParam);
    } catch (error) {
      console.error("Error parsing bodyParam:", error);
      return { header: "", answer: "Error parsing bodyParam", buttons: [], data: [], footer: "" };
    }
  } else {
    parsedBody = bodyParam;
  }

  if (textCheck(parsedBody)) {
    console.log("The message is a text message.");
    const extractedBody = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
  } else if (isButtonReply(parsedBody)) {
    const buttonTitle = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || '';
  }
  const phoneNo = parsedBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '';

  if (!phoneNo) {
    console.error("Error: phoneNo is empty.");
    return { header: "", answer: "Error extracting data", buttons: [], data: [], footer: "" };
  }

  let service = (await memoryManager.get(phoneNo, SENTIMENT_KEYS.SERVICE)) || '';
  let sessionId = (await memoryManager.get(phoneNo, USERS_KEYS.SESSION_ID)) || '';
  let keys = (await memoryManager.get(phoneNo, USERS_KEYS.KEY)) || '';
  let tokens = (await memoryManager.get(phoneNo, USERS_KEYS.TOKEN)) || '';

  if (!sessionId) {
    sessionId = generateRandomString(32);
    await memoryManager.set(phoneNo, USERS_KEYS.SESSION_ID, sessionId);
  }

  const body = {
    question: extractedBody,
    sentiment: sentiment,
    contact: phoneNo,
    service: service,
    session: sessionId,
    key: keys,
    token: tokens,
    context,
  };
  // console.error("#Ask body#", JSON.stringify(body, null, 2));
  const responseData = await callChatbotAPI(url, body);
  if (responseData && responseData.answer) {
    const AskData = responseData.data || [];
    const askButton = responseData.answer.button || []; // Ensure button extraction
    const transformedButtons: any[] = [];
    askButton.forEach((item: any) => {
      transformedButtons.push({
        id: item.id,
        title: item.title
      });
    });

    return {
      header: responseData.answer.header,
      answer: responseData.answer.text,
      buttons: transformedButtons,
      data: AskData,
      footer: responseData.answer.footer
    };
  } else {
    return { header: "", answer: "Error occurred while calling API", buttons: [], data: [], footer: "" };
  }
};



export async function sendMessageWithImageHeader(to: string, pmsg: string, img: string, pbutton: any[], pfooter: string): Promise<boolean> {

    try {
        // Make the Axios request to send the message
        const response = await axios.post(`https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "image",
                    image: {
                        link: img// Replace with your actual image link
                    }
                },
                body: {
                    text: pmsg
                },
                footer: {
                    text: pfooter // Optional, you can remove if not needed
                },
                action: {
                    buttons: pbutton 
                }
            }
        });

        // Check if the request was successful
        if (response.status === 200) {
            console.log('Message sent successfully');
            return true;
        } else {
            console.error('Failed to send message', response.data);
            return false;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

export async function sendSingleListSelectionMessage(to: string, listBody: ListBody, singleList: SingleList): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageData: any = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: listBody.body_text,
        },
        action: {
          button: listBody.button_text,
          sections: [singleList]
        }
      }
    };

    // Conditionally add header and footer, because those are optional ones 
    if (listBody.header_text) {
      messageData.interactive.header = {
        type: "text",
        text: listBody.header_text,
      };
    }

    if (listBody.footer_text) {
      messageData.interactive.footer = {
        text: listBody.footer_text,
      };
    }

    // Make the Axios request to send the message
    await axios.post(`https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`, messageData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the request is successful, return true
    return true;
  } catch (error) {
    // If an error occurs, log it and return false
    console.error("Error sending message:", error);
    return false;
  }
}


export async function send_CTA_URL_Message(to: string, textMessageContent: TextMessageContent, cta_url: CTA_URL): Promise<boolean> {
  try {
    const messageData: any = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: {
          text: textMessageContent.body,
        },
        action: {
          name: "cta_url",
          parameters: {
            display_text: cta_url.display_text,
            url: cta_url.url
          }
        }
      }
    };

    // Conditionally add header and footer, because those are optional ones 
    if (textMessageContent.header) {
      messageData.interactive.header = {
        type: "text",
        text: textMessageContent.header,
      };
    }

    if (textMessageContent.footer) {
      messageData.interactive.footer = {
        text: textMessageContent.footer,
      };
    }

    // Make the Axios request to send the message
    await axios.post(`https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`, messageData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the request is successful, return true
    return true;
  } catch (error) {
    // If an error occurs, log it and return false
    console.error("Error sending message:", error);
    return false;
  }
}

export async function sendLocationRequestingMessage(to: string, textMessage: string): Promise<boolean> {
  try {
    // Make the Axios request to send the message
    await axios.post(`https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`, {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "location_request_message",
        body: {
          text: textMessage
        },
        action: {
          name: "send_location"
        }
      }
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the request is successful, return true
    return true;
  } catch (error) {
    // If an error occurs, log it and return false
    console.error("Error sending message:", error);
    return false;
  }
}

export async function sendFlowMessage(to: string, bodyText: string, flowID: string, flowCTA: string, screenID: string, data: any = null): Promise<boolean> {
  try {
    // Build the flow_action_payload object conditionally
    let flowActionPayload: any = {
      screen: screenID
    };

    // If data is not null, add the data property
    if (data !== null) {
      flowActionPayload.data = data;
    }
    

    // console.log("Flow Action Payload:", JSON.stringify(flowActionPayload, null, 2));
    // Make the Axios request to send the message
    await axios.post(`https://graph.facebook.com/${version}/${phone_no_id}/messages?access_token=${token}`, {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "flow",
        body: {
          text: bodyText
        },
        footer: {
          text: "Powered by Online Transport"
        },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: "banana",
            flow_id: flowID,
            flow_cta: flowCTA,
            flow_action: "navigate",
            flow_action_payload: flowActionPayload
          }
        }
      }
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the request is successful, return true
    return true;
  } catch (error) {
    // If an error occurs, log it and return false
    console.error("Error sending message:", error);
    return false;
  }
}



// Function to get the address using OpenStreetMap Nominatim API
export async function getAddress(latitude: number, longitude: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();

        // Check if the address is found
        if (data && data.address) {
            return data.display_name;
        } else {
            return 'Address not found';
        }
    } catch (error) {
        console.error('Error:', error);
        return 'Error retrieving address';
    }
}


export const downloadVoiceNote = async (audioId: string): Promise<boolean> => {
  const mediaUrl = `https://graph.facebook.com/${version}/${audioId}`;
  
  try {
    // Step 1: Fetch the media URL
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const mediaDownloadUrl = mediaResponse.data.url;
    console.log(`Media URL: ${mediaDownloadUrl}`);

    // Step 2: Download the audio from the media URL
    const audioResponse = await axios.get(mediaDownloadUrl, {
      responseType: 'stream', // Download as a stream
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Define the folder path
    const downloadDir = path.resolve(__dirname, 'downloads');
    const audioPath = path.join(downloadDir, 'voice_note.ogg');

    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Step 3: Save the audio file locally
    const writer = fs.createWriteStream(audioPath);
    audioResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Voice note downloaded successfully at: ${audioPath}`);
        resolve(true);
      });

      writer.on('error', (error) => {
        console.error('Error downloading voice note:', error);
        reject(false);
      });
    });
  } catch (error: unknown) {
    console.error('Error downloading the audio:', error);
    return false;
  }
};
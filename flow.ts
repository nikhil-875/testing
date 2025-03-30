// import { RequestHandler } from "express";
import env from "../util/validateEnv";
import { getNextScreen } from "../util/flowHandler";
import * as crypto from "crypto"
import { decryptRequest, encryptResponse, FlowEndpointException } from "../util/encryption";
import { NextFunction, Request, RequestHandler } from "express";

const APP_SECRET = env.TOKEN;
const PRIVATE_KEY = env.PRIVATE_KEY;
const PASSPHRASE = env.PASSPHRASE;


export const sendFlows: RequestHandler = async (req, res, next) => {
  console.log("sendFlows start");
  // res.status(200).send("Flow setup here!");
  if (!PRIVATE_KEY) {
    throw new Error(
      'Private key is empty. Please check your env variable "PRIVATE_KEY".'
    );
  }

  console.log("isRequestSignatureValid start");
  if (!isRequestSignatureValid(req, next)) {
    // Return status code 432 if request signature does not match.
    // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
    return res.status(432).send();
  }
  console.log("isRequestSignatureValid end");

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(501).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  console.log("Decrypted Request:", decryptedBody);

  // TODO: Uncomment this block and add your flow token validation logic.
  // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
  // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes


  //   if (!isValidFlowToken(decryptedBody.flow_token)) {
  //     const error_response = {
  //       error_msg: `The message is no longer available`,
  //     };
  //     return res
  //       .status(427)
  //       .send(
  //         encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
  //       );
  //   }


  const screenResponse = await getNextScreen(decryptedBody);
  console.log("Response to Encrypt:", screenResponse);

  res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
};

export const getFlows: RequestHandler = async (req, res) => {
  res.status(200).send("Flow setup here!");
};


function isRequestSignatureValid(req: Request, next: NextFunction): boolean {
  if (!APP_SECRET) {
    console.warn("App Secret is not set up. Please Add your app secret in /.env file to check for request validation");
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  if (!signatureHeader) {
    console.error("Error: Signature header is missing.");
    return false;
  }

  let bodyData = '';
  req.on('data', chunk => {
    bodyData += chunk.toString(); // Concatenate chunks of data
  });

  req.on('end', () => {
    const hmac = crypto.createHmac("sha256", APP_SECRET);
    const digestString = hmac.update(bodyData).digest('hex');
    const digestBuffer = Buffer.from(digestString, "utf-8");

    const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");

    if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      console.error("Error: Request Signature did not match");
      return false;
    }

    next(); // Call next middleware or route handler if signature is valid
  });

  req.on('error', err => {
    console.error("Error reading request body:", err);
    return false;
  });

  return true;
}
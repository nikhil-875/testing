import { updatePropertyFormData } from "../services/tenantService";
import { sendFlowMessage } from "./apiHandler";


// Adjust the type of flowResponse to match the response shape.
export let flowResponse: { screen: string; data: any } | null = null;

export const getNextScreen = async (decryptedBody: {
  screen: any;
  data?: any;
  version: any;
  action: any;
  flow_token: any;
}) => {
  const { screen, data, version, action, flow_token } = decryptedBody;

  console.log("flow token:", flow_token);

  // Health check
  if (action === "ping") {
    return {
      screen: "ping",
      data: { status: "active" }
    };
  }

  // Handle client error
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      screen: "error",
      data: { acknowledged: true }
    };
  }

  // Flow logic based on flow_token
  if (flow_token === "apple") {
    if (action === "INIT") {
      console.log("INIT for apple");
      // return SCREEN_RESPONSES.APPOINTMENT;
    }
  } else if (flow_token === "banana") {
    console.log("flow token is banana");

    if (action === "INIT") {
      console.log("INIT for banana");
      // return FORM_DATA;
    }

    switch (screen) {
      case "PROPERTY":
        console.log("Data exchange triggered for PROPERTY");
        if (action === "data_exchange") {
          console.log("Data exchange action triggered", data);
          
          // Use the exported function to update and get the final property data.
          // const finalPropertyData = updatePropertyFormData(data);

          // Build the response in the desired shape.
          // flowResponse = {
          //   screen: "PROPERTY",
          //   data: finalPropertyData
          // };

          // console.log("Final PROPERTY_FORM_DATA:", finalPropertyData);
        }
        break;

      default:
        console.warn("Unhandled screen for banana token:", screen);
        break;
    }
    return flowResponse;
  }
  console.error("Unhandled request body:", decryptedBody);
};


export interface FlowData {
  phoneNumber: string;
  message: string;
  flowID: string;
  flowCTA: string;
  screenID: string;
  additionalData: any;
}
export async function executeFlow(
  body_param: any,
  phone_no: string,
  explicitMessage: string,
  key: string,
  definitions: Array<{ key: string; message: string }>,
  data: any,
  screenID: string,
  flowID: string,
  flowCTA: string
): Promise<void> {
  console.log("Executing flow with key:", key);
 

  // Generate the flows object using the provided definitions.
  const flows: Record<string, (data: any) => FlowData> = Object.fromEntries(
    definitions.map(({ key: defKey, message: defaultMessage }) => [
      defKey,
      (data: any) => ({
        phoneNumber: phone_no,
        // Use the explicitMessage when the keys match; otherwise, use the default message.
        message: defKey === key ? explicitMessage : defaultMessage,
        flowID: flowID,
        flowCTA: flowCTA,
        screenID: screenID,
        additionalData: data  // <-- Updated: pass data directly.
      })
    ])
  );

  const flowGenerator = flows[key];
  if (!flowGenerator) {
    console.error("No flow found for key:", key);
    return;
  }

  const flow = flowGenerator(data);

  try {
    const success = await sendFlowMessage(
      phone_no,
      explicitMessage,
      flow.flowID,
      flow.flowCTA,
      flow.screenID,
      flow.additionalData
    );
    console.log("Message sent:", success);
  } catch (err: any) {
    console.error("Error sending message:", err?.response?.data || err);
  }
}
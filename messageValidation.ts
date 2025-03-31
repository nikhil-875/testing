// Check if the webhook event is a message
export function messagesCheck(body_param: any): boolean {
  return (
    body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0]
  );
}

// Check if the webhook event is a status
export function statusCheck(body_param: any): boolean {
  return (
    body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.statuses
  );
}

// Check if the message is a text message
export function textMesssgeCheck(body_param: any): boolean {
  return (
    body_param.entry[0].changes[0].value.messages[0].type === "text" &&
    body_param.entry[0].changes[0].value.messages[0].text
  );
}

//Check if the message is interactive button reply
export function interactiveMessageCheck(body_param: any): boolean {
  return (
    body_param.entry[0].changes[0].value.messages[0].type === "interactive" &&
    body_param.entry[0].changes[0].value.messages[0].interactive
  );
}

export function listReplyCheck(body_param: any): boolean {
  if (
    body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].interactive &&
    body_param.entry[0].changes[0].value.messages[0].interactive.type === 'list_reply'
  ) {
    return true;
  } else {
    return false;
  }
}

export function textCheck(body_param: any): boolean {
  if (body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].text &&
    body_param.entry[0].changes[0].value.messages[0].text.body) {
    return true;
  } else {
    return false;
  }
}

export function locationCheck(body_param: any): boolean {
  if (body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].location &&
    body_param.entry[0].changes[0].value.messages[0].location.latitude &&
    body_param.entry[0].changes[0].value.messages[0].location.longitude) {
    return true;
  } else {
    return false;
  }
}


export function isButtonReply(body_param: any): boolean {
  if (
    body_param.object === "whatsapp_business_account" &&
    body_param.entry &&
    body_param.entry[0] &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0] &&
    body_param.entry[0].changes[0].value &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].interactive &&
    body_param.entry[0].changes[0].value.messages[0].interactive.type === "button_reply" &&
    body_param.entry[0].changes[0].value.messages[0].interactive.button_reply &&
    body_param.entry[0].changes[0].value.messages[0].interactive.button_reply.id
  ) {
    return true;
  } else {
    return false;
  }
}

export function payloadCheck(body_param: any): boolean {
  if (body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].button &&
    body_param.entry[0].changes[0].value.messages[0].button.payload) {
    return true;
  } else {
    return false;
  }
}

export function nfmReplyCheck(body_param: any): boolean {
  if (
    body_param.entry &&
    body_param.entry[0] &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0] &&
    body_param.entry[0].changes[0].value &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].interactive &&
    body_param.entry[0].changes[0].value.messages[0].interactive.nfm_reply &&
    body_param.entry[0].changes[0].value.messages[0].interactive.nfm_reply.response_json
  ) {
    return true;
  } else {
    return false;
  }
}

// Check if the message is an audio message
export function audioCheck(body_param: any): boolean {
  return (
    body_param.entry &&
    body_param.entry[0].changes &&
    body_param.entry[0].changes[0].value.messages &&
    body_param.entry[0].changes[0].value.messages[0] &&
    body_param.entry[0].changes[0].value.messages[0].type === "audio" &&
    body_param.entry[0].changes[0].value.messages[0].audio &&
    body_param.entry[0].changes[0].value.messages[0].audio.id // Ensure audio ID exists
  );
}

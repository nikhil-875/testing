// services/userFlowHandler.ts

import { memoryManager } from '../routes/memoryManager';
import { USERS_KEYS, SESSION_KEYS, COMPANY_SETTING, COMMON_KEYS } from '../constants/memoryKeys';
import {
  getUserByPhoneNumber,
  updateUserPhoneNumber,
  checkEmailExists,
  getCompanySettings
} from '../util/db/dbHandler';
import { isValidEmail } from '../util/validator';
import { sendTextMessages, sendInteractiveMessage, sendSingleListSelectionMessage } from '../util/apiHandler';

// ACTIVE USER
export async function handleActiveUserFlow(body_param: any, phone_no: string, profileName: string) {
  
 
  let userDetails;
 
    // Get user details from the database
    userDetails = await getUserByPhoneNumber(phone_no);
 
  if (userDetails) {
    // Store details in memory
    await memoryManager.set(phone_no, USERS_KEYS.FIRSTNAME, userDetails.first_name || "");
    await memoryManager.set(phone_no, USERS_KEYS.LASTNAME, userDetails.last_name || "");
    await memoryManager.set(phone_no, USERS_KEYS.EMAIL, userDetails.email || "");
    await memoryManager.set(phone_no, USERS_KEYS.TYPE, userDetails.type || "");
    await memoryManager.set(phone_no, USERS_KEYS.KEY, userDetails.id?.toString() || "");
  }
  const userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  const companySetting = await getCompanySettings(userid);
    const {
      company_name,
      company_email,
      company_phone,
      company_address,
      currency,
      timezone,
      invoice_number_prefix,
      expense_number_prefix,
      company_date_format,
      company_time_format
    } = companySetting;

await memoryManager.set(phone_no, COMPANY_SETTING.COMPANY_NAME, company_name || '');
await memoryManager.set(phone_no, COMPANY_SETTING.COMPANY_EMAIL, company_email || '');
await memoryManager.set(phone_no, COMPANY_SETTING.COMPANY_PHONE, company_phone || '');
await memoryManager.set(phone_no, COMPANY_SETTING.COMPANY_ADDRESS, company_address || '');
await memoryManager.set(phone_no, COMPANY_SETTING.CURRENCY_SYMBOL, currency || 'R');
await memoryManager.set(phone_no, COMPANY_SETTING.TIMEZONE, timezone || '');
await memoryManager.set(phone_no, COMPANY_SETTING.INVOICE_PREFIX, invoice_number_prefix || '');
await memoryManager.set(phone_no, COMPANY_SETTING.EXPENSE_PREFIX, expense_number_prefix || '');
await memoryManager.set(phone_no, COMPANY_SETTING.DATE_FORMAT, company_date_format || '');
await memoryManager.set(phone_no, COMPANY_SETTING.TIME_FORMAT, company_time_format || '');

  const greeting = await memoryManager.get(phone_no, COMMON_KEYS.GREETING);
  // Example: Show a main menu if user is “owner”
  if (userDetails?.type === "owner" && greeting === true) {
    await memoryManager.set(phone_no, SESSION_KEYS.LAST_LIST_TYPE, "properties");
    await memoryManager.delete(phone_no, COMMON_KEYS.GREETING);
    const listBody = {
      body_text: `Welcome ${profileName} to Estate Manager! Manage properties & tenants here.`,
      button_text: "Select an option",
      header_text: "Owner Dashboard",
      footer_text: "Powered by Estate Managers",
    };
    const singleList = {
      title: "Manage Options",
      rows: [
        { id: "ask_question", title: "Ask Question", description: "Ask anything about Estate Manager." },
        { id: "manage_properties", title: "Properties", description: "View and manage your properties" },
        { id: "view_all_tenants", title: "Tenants", description: "View and manage your tenants" }, 
        { id: "units", title: "Units", description: "View and manage your units" }
      ],
    };
    await sendSingleListSelectionMessage(phone_no, listBody, singleList);
  } else {
    // If user is not an owner, you can do something else
    const messageData = body_param.entry[0].changes[0].value.messages[0];
    const userMessage = messageData.text?.body || "Hello!";
    // Echo the user’s message
    await sendTextMessages(phone_no, userMessage);
  }
}

// INACTIVE USER
export async function handleInactiveUserFlow(body_param: any, phone_no: string, profileName: string) {
  const messageData = body_param.entry[0].changes[0].value.messages[0];
  const messageType = messageData.type;

  if (messageType === "text") {
    const awaitingEmail = await memoryManager.get(phone_no, SESSION_KEYS.AWAITING_EMAIL);
    if (awaitingEmail) {
      const emailText = messageData.text.body.trim();
      if (isValidEmail(emailText)) {
        const exists = await checkEmailExists(emailText);
        if (exists) {
          // Update user with phone
          await updateUserPhoneNumber(phone_no, emailText);
          await memoryManager.set(phone_no, USERS_KEYS.EMAIL, emailText);
          await memoryManager.delete(phone_no, SESSION_KEYS.AWAITING_EMAIL);
          await sendTextMessages(
            phone_no,
            `Thanks, ${profileName}! We've updated your records with your email: ${emailText}.`
          );
          return;
        } else {
          // Not a recognized email
          const errorMessage = `Oops, ${profileName}, this email is not registered. Would you like to register?`;
          const buttons = [
            { type: "reply", reply: { id: "register_owner_yes", title: "Yes" } },
            { type: "reply", reply: { id: "register_owner_no", title: "No" } },
          ];
          await sendInteractiveMessage(phone_no, errorMessage, buttons);
          return;
        }
      } else {
        await sendTextMessages(phone_no, `That doesn't look like a valid email. Please try again.`);
        return;
      }
    }
  }

  // If not awaiting an email, ask for it
  await memoryManager.set(phone_no, SESSION_KEYS.AWAITING_EMAIL, true);
  await sendTextMessages(
    phone_no,
    `Hi ${profileName},\n\nI couldn’t find a profile for you. Could you provide your email address?`
  );
}

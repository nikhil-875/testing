// services/buttonReplyHandler.ts

import { memoryManager } from '../routes/memoryManager';
import { isButtonReply } from '../util/messageValidation'; // <--- You need to import isButtonReply
import { PROPERTY_FORM_DATA, runPropertyDetailsFlow } from '../services/propertyService';
import { handleUnitReplyButton, handleViewUnits, runRentDetailsFlow, runRoomDetailsFlow, runUnitDetailsFlow } from '../services/unitService';
import { handleTenantPayments, handleViewTenants, runTenantUnitFlow, } from '../services/tenantService';
import { sendTextMessages } from '../util/apiHandler';
import { USERS_KEYS } from '../constants/memoryKeys';
import { runPaymentStatusFlow } from '../services/paymentService';

export let TENANT_FORM_DATA = null
export let userid: string | null = null;

export async function handleButtonReply(body_param: any, phone_no: string): Promise<boolean> {
  // 1) Check if the message is actually a button reply
  if (!isButtonReply(body_param)) {
    return false; // Not a button reply, so let other handlers proceed
  }

  const buttonId = body_param?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.id;
  userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  console.log("Button ID:", buttonId);

  // 3) Switch or if/else to handle the specific button reply ID
  switch (buttonId) {
    
    case 'view_units':
      // Example: user clicked "View Units"
      await handleViewUnits(body_param, phone_no);
      break;
      case 'update_property_details':
        runPropertyDetailsFlow(body_param, phone_no,PROPERTY_FORM_DATA)
        break;

      // 
    case 'view_tenants':
        if (userid) {
          await handleViewTenants(body_param, phone_no, userid);
        } else {
          await sendTextMessages(phone_no, "We could not identify your user session. Please log in again.");
        }
      break;

    case 'tenant_payments':
      if (userid) {
        await handleTenantPayments(body_param, phone_no, userid);
      } else {
        await sendTextMessages(phone_no, "We could not identify your user session. Please log in again.");
      }
      break;

    case 'update_unit_details': 
    handleUnitReplyButton(body_param, phone_no)
    break;
    case 'update_unit_screen1': 
    runUnitDetailsFlow(body_param, phone_no);
    break
    case 'update_unit_screen2': 
    runRoomDetailsFlow(body_param, phone_no);
    break
    case 'update_unit_screen3': 
    runRentDetailsFlow(body_param, phone_no);
    break
    case 'add_tenant_details': 
    runRentDetailsFlow(body_param, phone_no);
    break
    case 'add_tenant_unit': 
    if (userid) {
        runTenantUnitFlow(body_param, phone_no, userid);
    } else {
        await sendTextMessages(phone_no, "We could not identify your user session. Please log in again.");
    }
    break
    case 'update_payment_status': 
    if (userid) {
        runPaymentStatusFlow(body_param, phone_no, userid);
    } else {
        await sendTextMessages(phone_no, "We could not identify your user session. Please log in again.");
    }
    break    
    // Add more button IDs as needed...
    default:
      console.error("Unhandled button ID:", buttonId);
      await sendTextMessages(phone_no, "That button is not recognized. Please try again.");
      break;
  }

  // If we've reached here, it means we handled the button reply
  return true;
}



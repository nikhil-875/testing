// services/listReplyHandler.ts

import { memoryManager } from '../routes/memoryManager';
import { listReplyCheck } from '../util/messageValidation';
import { SESSION_KEYS } from '../constants/memoryKeys';
import { handlePropertiesListReply } from '../services/propertyService';
import { handleUnitsListReply } from '../services/unitService';
import { sendTextMessages } from '../util/apiHandler';
import { handleTenantsListReply, } from '../services/tenantService';
import { handleInvoicesListReply } from '../services/paymentService';
import { executeFlow } from '../util/flowHandler';


export async function handleListReply(body_param: any, phone_no: string): Promise<boolean> {
  // 1) Check if this is a list reply at all
  if (!listReplyCheck(body_param)) {
    return false; // Not a list reply; let other handlers proceed
  }

  console.log("Handling list reply...");

  const selectedId = body_param?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.list_reply?.id;
  if (!selectedId) {
    return false; // Something is off, no selection ID
  }

  // 2) Determine which list type is currently in session
  const listType = await memoryManager.get(phone_no, SESSION_KEYS.LAST_LIST_TYPE);
  console.log("#List Type#:", listType, selectedId);

  // 3) Delegate to the specific operation handler
  switch (listType) {
    case 'properties':
      await handlePropertiesListReply(phone_no, selectedId, body_param);
      break;
    case 'units':
      await handleUnitsListReply(body_param, phone_no, selectedId);
      break;
      
      
    case 'tenants':
      if (selectedId === '0') { 
        // runTenantDetailsFlow({ body_param, phone_no, executeFlow, operation: 'add' });
      } else {
      await handleTenantsListReply(body_param, phone_no, selectedId);
      }
      break;
    case 'tenant_payments':
      await handleInvoicesListReply(phone_no, selectedId);
      break;
    default:
      console.error("Unhandled list type:", listType);
      await sendTextMessages(phone_no, "Oops! We couldn't process that selection. Please try again.");
      break;
  }

  return true; 
}

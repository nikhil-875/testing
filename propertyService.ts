import { memoryManager } from '../routes/memoryManager';
import { PROPERTY, SESSION_KEYS, USERS_KEYS } from '../constants/memoryKeys';
import { getProperties, getType } from '../util/db/dbHandler';
import { DataSourceItem } from '../types/types';
import { sendInteractiveMessage, sendSingleListSelectionMessage, sendTextMessages, } from '../util/apiHandler';
import { handleViewTenants } from './tenantService';
import { trimText } from '../util/stringUtils';
import { executeFlow } from '../util/flowHandler';

// Exported variables for form data and property data source
export let PROPERTY_FORM_DATA: any = null;
export let PropertyDataSource: DataSourceItem[] = []; // Dynamically generated

let userid;
let propertyTypeOptions: DataSourceItem[] = [];

export async function handlePropertiesListReply(
  phone_no: string,
  selectedId: string,
  body_param?: any
): Promise<void> {
  userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);

  if (!isNaN(Number(selectedId))) {
    await memoryManager.set(phone_no, PROPERTY.PROPERTIES_ID, selectedId);
    const propertyTypes = await getType(userid, 'PROPERTY_TYPE');
    const propertyTypeOptions: DataSourceItem[] = propertyTypes.map((type: string) => ({
      id: type,
      title: type,
    }));
    await memoryManager.set(phone_no, PROPERTY.PROPERTY_TYPE, propertyTypeOptions);
  }

  switch (selectedId) {
    case "0": {
      propertyTypeOptions = await memoryManager.get(phone_no, PROPERTY.PROPERTY_TYPE);
      PROPERTY_FORM_DATA = { propertyTypeOptions };
      runPropertyDetailsFlow(body_param, phone_no, PROPERTY_FORM_DATA);
      break;
    }
    case "manage_properties": {
      await memoryManager.set(phone_no, SESSION_KEYS.LAST_LIST_TYPE, "properties");
      // Fetch all properties from the DB
      const properties = await getProperties(userid);
      memoryManager.set(phone_no, PROPERTY.PROPERTIES, properties);
   
      if (properties.length > 0) {
        // Prepare list data
        const listBody = {
          body_text: `Here’s a list of your properties. Tap on one to view details, make updates, or add a new property.\n...`,
          button_text: "Manage Properties",
          header_text: "Your Properties",
          footer_text: "Managed by Estate Manager",
        };

        const singleList = {
          title: trimText("Your Property List", 24),
          rows: properties.map((prop: any) => ({
            id: prop.id.toString(),
            title: trimText(prop.name, 24),
            description: trimText(prop.address || "Tap to add a new property", 72),
          })),
        };

        await sendSingleListSelectionMessage(phone_no, listBody, singleList);
      } else {
        await sendTextMessages(phone_no, "No properties available for management.");
      }
      break;
    } case "view_all_tenants": {
      handleViewTenants(body_param, phone_no, userid)
      break
    }
    default: {
      if (!isNaN(Number(selectedId))) {
        const storedProperties: any[] =
          (await memoryManager.get(phone_no, PROPERTY.PROPERTIES)) || [];
        propertyTypeOptions = await memoryManager.get(phone_no, PROPERTY.PROPERTY_TYPE);
        const selectedProperty = storedProperties.find(
          (prop: any) => prop.id.toString() === selectedId
        );
        PROPERTY_FORM_DATA = {
          id: selectedProperty.id,
          propertyName: selectedProperty.name,
          propertyTypeOptions,
          propertyType:
            selectedProperty.propertyTypeId ||
            (propertyTypeOptions[0] ? propertyTypeOptions[0].id : ''),
          address: selectedProperty.address,
          ...selectedProperty, // Preserve any other keys from selectedProperty
        };

        const propertyMessage = `*Property Details*\n\n*Name:* ${selectedProperty.name}\n*Address:* ${selectedProperty.address}\n*Type:* ${selectedProperty.type}\n\n🏠 This property is currently listed under your management. You can update its details, view available units, or upload a new property photo. \n\nLet me know how you'd like to proceed!`;
        const buttons = [
          {
            type: "reply",
            reply: { id: "view_units", title: "View Property Units" },
          },
          {
            type: "reply",
            reply: { id: "update_property_details", title: "Update Property" },
          },
        ];
        await sendInteractiveMessage(phone_no, propertyMessage, buttons);
      } else {
        // No matching property found
        await sendTextMessages(phone_no, "Oops! We couldn't locate that property. Try again?");
      }
      break;
    }
  }
}

export function runPropertyDetailsFlow(
  body_param: any,
  phone_no: string,
  propertyFormData: any = null
): void {
  const flowDefinitions = [
    { key: "update_property", message: "Please provide your property details." },
    { key: "update_details", message: "Please update your details." },
  ];
  const screenID = "screen_property";
  const flowID = "1176744643678091";
  const flowCTA = "Continue";

  // Execute the flow with an explicit message override and flow key.
  executeFlow(
    body_param,
    phone_no,
    "Please provide your property details.",
    "update_property",
    flowDefinitions,
    propertyFormData,
    screenID,
    flowID,
    flowCTA
  );
}

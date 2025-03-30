// services/unitService.ts

import { memoryManager } from '../routes/memoryManager';
import { COMPANY_SETTING, FLOW_KEYS, PROPERTY, SESSION_KEYS, UNIT, USERS_KEYS } from '../constants/memoryKeys';
import { getPropertyUnits, getType } from '../util/db/dbHandler';
import { sendTextMessages, sendSingleListSelectionMessage, sendInteractiveMessage } from '../util/apiHandler';
import { DataSourceItem, defaultDataSource } from '../types/types';
import { trimText } from '../util/stringUtils';
import { executeFlow } from '../util/flowHandler';

interface ExecuteFlowParams {
  body_param: any;
  phone_no: string;
  executeFlow: Function;
}
let UNIT_DETAILS_FORM_DATA = null;

export async function handleViewUnits(body_param: any, phone_no: string): Promise<void> {
  const useridString = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  const userid = parseInt(useridString, 10);
  const selectedPropertyId = await memoryManager.get(phone_no, PROPERTY.PROPERTIES_ID);

  const currency = await memoryManager.get(phone_no, COMPANY_SETTING.CURRENCY_SYMBOL);
  
  await memoryManager.set(phone_no, SESSION_KEYS.LAST_LIST_TYPE, "units");

  try {
    const storedUnits = await getPropertyUnits(userid, selectedPropertyId);
    await memoryManager.set(phone_no, UNIT.UNITS, storedUnits);

    if (storedUnits.length > 1) {

      const listBody = {
        body_text: "Here’s a list of your property units. Tap on one to view details, make updates, or add a new unit. 😊",
        button_text: "Manage Units",
        header_text: "Your Property Units",
        footer_text: "Managed by Estate Manager",
      };

      const singleList = {
        title: trimText("Your Unit List", 24),
        rows: storedUnits.map((unit: any) => ({
          id: unit.unit_id.toString(),
          title: trimText(unit.name, 24),
          description: trimText(`Bedrooms: ${unit.bedroom ?? 0}, Rent: ${currency}${unit.rent ?? 0.00}`,72),
        })),
      };

      await sendSingleListSelectionMessage(phone_no, listBody, singleList);
    } else {
      await sendTextMessages(phone_no, "No property units available.");
    }
  } catch (error) {
    console.error("Error fetching units:", error);
    await sendTextMessages(phone_no, "An error occurred while retrieving property units.");
  }
}

export async function handleUnitsListReply(body_param: any, phone_no: string, selectedId: string): Promise<void> {
 
  await memoryManager.set(phone_no, UNIT.UNIT_ID, selectedId);
  const units = await memoryManager.get(phone_no, UNIT.UNITS);
  const currency = await memoryManager.get(phone_no, COMPANY_SETTING.CURRENCY_SYMBOL);
  const userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);


  if (!units || !Array.isArray(units)) {
    console.log('Units not found or not in the correct format.');
    return;
  }
  
  const selectedUnit = units.find((u: any) => u.unit_id.toString() === selectedId);
  if (selectedUnit) {

    await memoryManager.set(phone_no, UNIT.SELECTED_UNIT, selectedUnit);
    const flowDefinitions = [
      { key: "update_property", message: "Please provide your property details." },
      { key: "update_details", message: "Please update your unit details." }
    ];

    const screenID = "screen_details";
    const flowID = "1244897167250804";
    const screenMessage = "Please update your unit details.";
    const updateFlowKey = "update_details";

    memoryManager.set(phone_no, FLOW_KEYS.FLOW_DEFINITIONS, flowDefinitions)
    memoryManager.set(phone_no, FLOW_KEYS.SCREEN_ID, screenID)
    memoryManager.set(phone_no, FLOW_KEYS.FLOW_ID, flowID)
    memoryManager.set(phone_no, FLOW_KEYS.SCREEN_MESSAGE, screenMessage)
    memoryManager.set(phone_no, FLOW_KEYS.UPDATE_FLOW_KEY, updateFlowKey)

    const unitTypes = await getType(userid, 'UNIT_TYPE');
    const propertyOptions: DataSourceItem[] = unitTypes.map((type: string) => ({
      id: type,
      title: type,
    }));
    const occupantOptions: DataSourceItem[] = defaultDataSource;
    
    switch (Number(selectedId)) {
      case 0:

        UNIT_DETAILS_FORM_DATA = {propertyOptions, occupantOptions}
        runRentFlow(body_param, phone_no, UNIT_DETAILS_FORM_DATA)
        break;
    
      default:
      
        const unitMessage = `*Property Unit Details*\n\n*Name:* ${selectedUnit.name}\n*Rent:* ${
          selectedUnit.rent ? `${currency}${selectedUnit.rent} per month` : "Not specified"
        } \n*Bedrooms:* ${selectedUnit.bedroom || "0"} \n*Baths:* ${selectedUnit.baths || "0"} \n*Kitchens:* ${
          selectedUnit.kitchen || "0"
        }\n\nThis unit is currently part of your managed properties. You can update its details, view current tenants, or upload a new unit photo. Let me know how you'd like to proceed! 😊`;
    
        const buttons = [
          { type: "reply", reply: { id: "update_unit_details", title: "Update Property Unit" } },
          { type: "reply", reply: { id: "view_tenants", title: "View Tenants" } },
        ];
        await sendInteractiveMessage(phone_no, unitMessage, buttons);
        break;
    }
    

  } else {
    console.log(`No unit found with ID: ${selectedId}`);
  }
}


export async function handleUnitReplyButton (body_param: any, phone_no: string) {
  const unitMessage = "*Unit Management* \n\nReady to manage your unit? Whether you want to update details, check out the rooms, or upload rent info — just tap an option below to get started!";
  const buttons = [
        { type: "reply", reply: { id: "update_unit_screen1", title: "Update Details" } },
        { type: "reply", reply: { id: "update_unit_screen2", title: "Update Rooms" } },
        { type: "reply", reply: { id: "update_unit_screen3", title: "Update Rent" } },
      ];
      await sendInteractiveMessage(phone_no, unitMessage, buttons);

}

export async function runUnitDetailsFlow(body_param: any, phone_no: string) {
  const flowDefinitions = [
    { key: "update_property", message: "Please provide your property details." },
    { key: "update_details", message: "Please update your unit details." }
  ];

  const screenID = "screen_details";
  const flowID = "1244897167250804";
  const screenMessage = "Please update your unit details.";
  const updateFlowKey = "update_details";

  memoryManager.set(phone_no, FLOW_KEYS.FLOW_DEFINITIONS, flowDefinitions)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_ID, screenID)
  memoryManager.set(phone_no, FLOW_KEYS.FLOW_ID, flowID)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_MESSAGE, screenMessage)
  memoryManager.set(phone_no, FLOW_KEYS.UPDATE_FLOW_KEY, updateFlowKey)

  const userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  const selectedUnit = await memoryManager.get(phone_no, UNIT.SELECTED_UNIT);
  const unitTypes = await getType(userid, 'UNIT_TYPE');
  const propertyOptions: DataSourceItem[] = unitTypes.map((type: string) => ({
      id: type,
      title: type,
    }));
    const occupantOptions: DataSourceItem[] = defaultDataSource;

    UNIT_DETAILS_FORM_DATA = {name: selectedUnit.name || "", propertyOptions, property: "Apartment", occupantOptions, maximumOccupants: "4"}
    runRentFlow(body_param, phone_no, UNIT_DETAILS_FORM_DATA)
  
}

export async function runRoomDetailsFlow(body_param: any, phone_no: string) {
  
  const screenID = "screen_rooms";
  const flowID = "1331368504747427";
  const screenMessage = "Please update your room details.";
  const updateFlowKey = "update_rooms";
  const flowDefinitions = [
    { key: "update_property", message: "Please provide your property details." },
    { key: "update_rooms", message: "Please update your room details." }
  ];

  memoryManager.set(phone_no, FLOW_KEYS.FLOW_DEFINITIONS, flowDefinitions)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_ID, screenID)
  memoryManager.set(phone_no, FLOW_KEYS.FLOW_ID, flowID)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_MESSAGE, screenMessage)
  memoryManager.set(phone_no, FLOW_KEYS.UPDATE_FLOW_KEY, updateFlowKey)

  const selectedUnit = await memoryManager.get(phone_no, UNIT.SELECTED_UNIT);
  const ROOM_DETAILS_FORM_DATA = {
    bedroomOptions: defaultDataSource as DataSourceItem[],
    bedroom: String(selectedUnit.bedroom),
    kitchenOptions: defaultDataSource as DataSourceItem[],
    kitchen: String(selectedUnit.kitchen),
    bathroomOptions: defaultDataSource as DataSourceItem[],
    bathroom: String(selectedUnit.baths),
    others: selectedUnit.notes
  };
  runRentFlow(body_param, phone_no, ROOM_DETAILS_FORM_DATA)
}

export async function runRentDetailsFlow(body_param: any, phone_no: string) {
  const screenID = "screen_rent";
  const flowID = "1342805840354521";
  const screenMessage = "Please update your rent details.";
  const updateFlowKey = "update_rent";
  const flowDefinitions = [
    { key: "update_rooms", message: "Please update your room details." },
    { key: "update_rent", message: "Please update your rent details." }
  ];

  memoryManager.set(phone_no, FLOW_KEYS.FLOW_DEFINITIONS, flowDefinitions)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_ID, screenID)
  memoryManager.set(phone_no, FLOW_KEYS.FLOW_ID, flowID)
  memoryManager.set(phone_no, FLOW_KEYS.SCREEN_MESSAGE, screenMessage)
  memoryManager.set(phone_no, FLOW_KEYS.UPDATE_FLOW_KEY, updateFlowKey)

  const userid = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  const selectedUnit = await memoryManager.get(phone_no, UNIT.SELECTED_UNIT);

  const rentTypes = await getType(userid, 'RENT_TYPE');
  const rentTypeOptions: DataSourceItem[] = rentTypes.map((type: string) => ({
      id: type,
      title: type,
    }));

  const depositTypes = await getType(userid, 'DEPOSIT_TYPE');
  const depositTypeOptions: DataSourceItem[] = depositTypes.map((type: string) => ({
      id: type,
      title: type,
    }));
    // depositType: selectedUnit.deposit_type,
  console.log('selectedUnit',selectedUnit)
  const RENT_DETAILS_FORM_DATA = {
    rentTypeOptions,
    rentType: selectedUnit.rent_type,
    amount: selectedUnit.rent,
    depositTypeOptions,
    depositType: selectedUnit.deposit_type,
    depositAmount: selectedUnit.deposit_amount
  };

  runRentFlow(body_param, phone_no, RENT_DETAILS_FORM_DATA)
}


export async function runRentFlow(
  body_param: any,
  phone_no: string,
  propertyFormData: any = null
): Promise<void> {

  const flowDefinitions = await memoryManager.get(phone_no, FLOW_KEYS.FLOW_DEFINITIONS);
  const screenID = await memoryManager.get(phone_no, FLOW_KEYS.SCREEN_ID);
  const flowID = await memoryManager.get(phone_no, FLOW_KEYS.FLOW_ID);
  const screenMessage = await memoryManager.get(phone_no, FLOW_KEYS.SCREEN_MESSAGE); 
  const updateFlowKey = await memoryManager.get(phone_no, FLOW_KEYS.UPDATE_FLOW_KEY); 
  const flowCTA = "Continue";

  executeFlow(
    body_param,
    phone_no,
    screenMessage,
    updateFlowKey,
    flowDefinitions,
    propertyFormData,
    screenID,
    flowID,
    flowCTA
  );
}

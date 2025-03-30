import { memoryManager } from '../routes/memoryManager';
import {
  sendInteractiveMessage,
  sendSingleListSelectionMessage,
  sendTextMessages
} from '../util/apiHandler';
import { getPaidInvoices, getPropertyUnits, getTenants } from '../util/db/dbHandler';
import { COMMON_KEYS, COMPANY_SETTING, SESSION_KEYS, TENANT, UNIT, USERS_KEYS } from '../constants/memoryKeys';
import { trimText } from '../util/stringUtils';
import { executeFlow } from '../util/flowHandler';
import { formatISODateToYYYYMMDD } from '../util/DateUtils';

export interface TenantDetails {
  user_id: string; 
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  user_phone_number: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_name: string;
  unit_rent: string | null;
  unit_rent_type: string | null;
}

let storedTenants: TenantDetails[];
let selectedTenant: TenantDetails | null = null;
let TENANT_FORM_DATA: Record<string, any> | null = null;

export async function handleViewTenants(body_param: any, phone_no: string, userId: string): Promise<void> {
  if (!userId) {
    await sendTextMessages(phone_no, "We could not identify your user session. Please log in again.");
    return;
  }

  const unitId = await memoryManager.get(phone_no, UNIT.UNIT_ID);
  const numericUserId = Number(userId);
  const tenants = unitId
    ? await getTenants(numericUserId, Number(unitId))
    : await getTenants(numericUserId);

  await memoryManager.set(phone_no, TENANT.TENANTS, tenants);
  await memoryManager.set(phone_no, SESSION_KEYS.LAST_LIST_TYPE, 'tenants');

  if (tenants.length > 0) {
    const listBody = {
      body_text: 'Here are the tenants currently occupying this unit.',
      button_text: 'Manage Tenants',
      header_text: 'Tenant List',
      footer_text: '🏠 Managed by Estate Manager'
    };

    const singleList = {
      title: 'Select a Tenant',
      rows: tenants.map((tenant: TenantDetails) => ({
        id: tenant.user_id.toString(),
        title: tenant.user_id === '0'
          ? '➕ Add New Tenant'
          : `${tenant.user_first_name} ${tenant.user_last_name}`,
        description: tenant.user_id === '0'
          ? 'Tap to register a new tenant'
          : `📍 Property: ${tenant.property_name || ''}`
      }))
    };

    try {
      await sendSingleListSelectionMessage(phone_no, listBody, singleList);
    } catch (error: any) {
      if (error?.error?.code === 131030) {
        console.error("Recipient phone number not in allowed list. Please add the recipient's phone number to your WhatsApp API allowed list.");
      } else {
        console.error("Error sending list selection message:", error);
      }
      throw error;
    }
  } else {
    await sendTextMessages(phone_no, 'No tenants found for this unit.');
  }
}

export async function handleTenantsListReply(body_param: any, phone_no: string, selectedId: string): Promise<void> {
  await memoryManager.set(phone_no, TENANT.TENANT_ID, selectedId);

  const parentId = await memoryManager.get(phone_no, USERS_KEYS.KEY);
  const unitId = await memoryManager.get(phone_no, UNIT.UNIT_ID);
  console.log('parent id:', parentId, 'unit id:', unitId, 'tenant id', selectedId);

  let tenants;
  if (!unitId) {
    storedTenants = await getTenants(Number(parentId));
    tenants = (storedTenants as (TenantDetails | null)[]).filter(
      (t): t is TenantDetails => t !== null
    );
  } else {
    storedTenants = await getTenants(Number(parentId), Number(unitId));
    tenants = (storedTenants as (TenantDetails | null)[]).filter(
      (t): t is TenantDetails => t !== null
    );
  }

  // Update session with tenant list.
  await memoryManager.set(phone_no, TENANT.TENANTS, tenants);
  // Find the tenant that matches the selected ID.
  selectedTenant = (tenants ?? []).find((t) => t.user_id === selectedId) || null;

  try {
    if (selectedTenant) {
      console.log('Selected tenant:', selectedTenant);
      const currency = await memoryManager.get(phone_no, COMPANY_SETTING.CURRENCY_SYMBOL);
      await memoryManager.set(phone_no, TENANT.SELECTED_TENANT, selectedTenant);
    
      const tenantMessage = `*Tenant Details*\n\n*Name:* ${selectedTenant.user_first_name} ${selectedTenant.user_last_name}\n*Property:* ${selectedTenant.property_name || 'Unknown Property'}\n*Unit:* ${selectedTenant.unit_name || 'Unknown Unit'}\n*Lease Type:* ${selectedTenant.unit_rent_type || 'Not provided'}\n*Monthly Rent:* ${selectedTenant.unit_rent ? `${currency}${selectedTenant.unit_rent}` : 'Not specified'}\n\nThis tenant is currently residing at *${selectedTenant.unit_name || 'Unknown Unit'}* in *${selectedTenant.property_name || 'Unknown Property'}*. You can update their details, view payment history, or manage lease agreements. Let me know how you'd like to proceed! 😊`;

      const buttons = [
        { type: 'reply', reply: { id: 'add_tenant_details', title: 'Update Details' } },
        { type: 'reply', reply: { id: 'add_tenant_unit', title: 'View Tenant Unit' } },
        { type: 'reply', reply: { id: 'tenant_payments', title: 'View Tenant Payments' } },
      ];

      try {
        await sendInteractiveMessage(phone_no, tenantMessage, buttons);
      } catch (error: any) {
        console.error("Error sending interactive message:", error);
        throw error;
      }
    } else {
      await sendTextMessages(phone_no, "Couldn't locate that tenant. Please try again.");
    }
  } catch (error) {
    console.error('Error handling tenant list reply:', error);
    await sendTextMessages(phone_no, 'An error occurred while fetching tenant details.');
  }
}

export async function handleTenantPayments(body_param: any, phone_no: string, userid: string): Promise<void> {
  try {
    const tenantId = Number(await memoryManager.get(phone_no, TENANT.TENANT_ID));
    const currency =  await memoryManager.get(phone_no, COMPANY_SETTING.CURRENCY_SYMBOL);

    if (isNaN(tenantId) || isNaN(Number(userid))) {
      await sendTextMessages(phone_no, "Unable to fetch tenant payment records. Please try again.");
      return;
    }

    await memoryManager.set(phone_no, SESSION_KEYS.LAST_LIST_TYPE, "tenant_payments");
    const invoices = await getPaidInvoices(tenantId, Number(userid));
    await memoryManager.set(phone_no, COMMON_KEYS.INVOICES, invoices);

    if (!invoices || invoices.length === 0) {
      await sendTextMessages(phone_no, "No paid invoices found for this tenant.");
    } else {
      // Ensure safe mapping of invoices
      const rows = invoices.map((invoice: any) => ({
        id: invoice.id.toString(), // Ensure id is treated as a string
        title: trimText(invoice.description || "Invoice", 24), // Handle empty descriptions
        description: `📅 ${invoice.dated || 'Unknown Date'} | ${currency}${invoice.amount || '0'}`,
      }));

      const listBody = {
        body_text: "Here’s a list of all paid invoices for this tenant.",
        button_text: "View Invoices",
        header_text: "Tenant Payment History",
        footer_text: "💳 Managed by Estate Manager",
      };
      const singleList = {
        title: "Select an Invoice",
        rows: rows,
      };

      await sendSingleListSelectionMessage(phone_no, listBody, singleList);
    }
  } catch (error) {
    console.error("Error retrieving tenant payments:", error);
    await sendTextMessages(phone_no, "An error occurred while retrieving tenant payments.");
  }
}

export function updatePropertyFormData(data: {
  property?: string;
  dateFrom?: string;
  dateTo?: string;
}): void {
  // Implementation for updating property form data goes here.
}



export async function runTenantUnitFlow(body_param: any, phone_no: string, userid: string ) {
  // Define flow definitions for context (customize messages and keys as needed)
  const flowDefinitions = [
    { key: "update_property", message: "Please provide your property details." }
  ];

  const screenID = "PROPERTY";
  const flowID = "23992118790376903";
  const flowCTA = "Continue";

  // Retrieve property units
  const storedUnits = await getPropertyUnits(Number(userid));
  const tenantId = Number(await memoryManager.get(phone_no, TENANT.TENANT_ID));
  console.log('storedUnits', storedUnits);

  // Generate propertyOptions dynamically from storedUnits (ignoring null property_id)
  const propertyOptions = storedUnits
    .filter(unit => unit.property_id !== null)
    .reduce((acc, unit) => {
      // Only add unique property entries based on property_id
      if (!acc.find((opt: { id: string }) => opt.id === unit.property_id)) {
        acc.push({ id: unit.property_id, title: unit.property_name });
      }
      return acc;
    }, []);

  // Filter storedUnits for the tenant's property (assuming tenantId maps to property_id)
  const tenantUnits = storedUnits.filter(unit => unit.tenant_id === tenantId);
  const selectedPropertyId =  tenantUnits.length > 0 ? tenantUnits[0].property_id : '';
  const selectedUnitId =  tenantUnits.length > 0 ? tenantUnits[0].unit_id : '';
  const selectedStartDate =  tenantUnits.length > 0 ? tenantUnits[0].start_date : '';
  const selectedEndDate =  tenantUnits.length > 0 ? tenantUnits[0].end_date : '';

// Filter tenantUnits to only include units that match the selected property_id
const filteredUnits = tenantUnits.filter(unit => unit.property_id === selectedPropertyId);
const tenantUnitOptions = filteredUnits.map(unit => ({
  id: unit.unit_id,
  title: unit.name
}));



  let PROPERTY_FORM_DATA = {
    propertyOptions: propertyOptions, 
    property: selectedPropertyId,       
    unitOptions: tenantUnitOptions,       
    unit: selectedUnitId,
    dateFrom: formatISODateToYYYYMMDD(selectedStartDate),
    dateTo: formatISODateToYYYYMMDD(selectedEndDate),
    unitVisible: true,
    unitEnabled: true
  };

  console.log('#storedUnits#', PROPERTY_FORM_DATA);
  // Execute the flow using the initial PROPERTY_FORM_DATA.
  const response = executeFlow(
    body_param,
    phone_no,
    "Please provide your property details.",
    "update_property",
    flowDefinitions,
    PROPERTY_FORM_DATA,
    screenID,
    flowID,
    flowCTA
  );

  return response;
}

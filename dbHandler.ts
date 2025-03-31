// import { TenantDetails } from '../../services/tenantService';
import { TenantDetails } from '../../services/tenantService';
import pool from './dbPool';

export async function checkUserActiveStatus(phoneNumber: string): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements((phone_number::jsonb)->'phoneNumbers') AS pn
        WHERE pn->>'phoneNumber' = $1
      )
      AND is_active = 1
    ) AS is_active;
  `;
  try {
    const result = await pool.query(query, [phoneNumber]);
    return result.rows[0]?.is_active || false;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export interface UserDetails {
  id: number;
  first_name: string | null;
  last_name: string | null;
  type: string;
  email: string | null;
  subscription: string | null;
  subscription_expire_date: Date | null;
}

export async function getUserByPhoneNumber(phoneNumber: string): Promise<UserDetails | null> {
  const query = `
    SELECT 
      id, 
      first_name, 
      last_name, 
      "type",
      email,
      subscription,
      subscription_expire_date
    FROM users
    WHERE EXISTS (
      SELECT 1 
      FROM jsonb_array_elements((phone_number::jsonb)->'phoneNumbers') AS pn
      WHERE pn->>'phoneNumber' = $1
    )
    LIMIT 1;
  `;
  try {
    const result = await pool.query(query, [phoneNumber]);
    console.log("Database Query Result:", result.rows);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error in getUserByPhoneNumber:', error);
    return null;
  }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE email = lower($1)
    ) AS email_exists;
  `;
  try {
    const result = await pool.query(query, [email]);
    return result.rows[0]?.email_exists || false;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function updateUserPhoneNumber(phoneNumber: string, email: string): Promise<boolean> {
  const query = `
    UPDATE public.users
    SET phone_number = (
      CASE 
        WHEN phone_number IS NULL THEN 
          jsonb_build_object(
            'phoneNumbers',
            jsonb_build_array(
              jsonb_build_object('phoneNumber', $1::text)
            )
          )::jsonb
        WHEN jsonb_array_length((phone_number::jsonb)->'phoneNumbers') = 1 THEN 
          jsonb_set(
            phone_number::jsonb,
            '{phoneNumbers}',
            (phone_number::jsonb->'phoneNumbers') || 
            jsonb_build_array(jsonb_build_object('phoneNumber', $1::text))::jsonb
          )
        ELSE 
          jsonb_set(
            phone_number::jsonb,
            '{phoneNumbers}',
            (phone_number::jsonb->'phoneNumbers') || 
            jsonb_build_array(jsonb_build_object('phoneNumber', $1::text))::jsonb
          )
      END
    )
    WHERE LOWER(email) = LOWER($2::text);
  `;
  try {
    const result = await pool.query(query, [phoneNumber, email]);
    console.log("Query executed successfully.");
    console.log("Updated Rows:", result.rowCount);
    if (result.rowCount === 0) {
      console.warn(`No rows updated. Possible reasons:
      - The email '${email}' does not exist.
      - The phone number '${phoneNumber}' is already stored correctly.
      - There was a silent failure in PostgreSQL.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Database error while updating phone number:", error);
    return false;
  }
}

export async function getCompanySettings(parentId: number): Promise<Record<string, any>> {
  const query = `
    SELECT json_object_agg(name, value) AS settings_json
    FROM settings
    WHERE parent_id = $1;
  `;
  try {
    const result = await pool.query(query, [parentId]);
    return result.rows[0]?.settings_json || {};
  } catch (error) {
    console.error('Error fetching company settings:', error);
    throw new Error('Failed to retrieve company settings.');
  }
}

export async function getProperties(parentId: number) {
  try {
    const query = `
      SELECT  
        0 AS id, 
        'Add Property' AS name, 
        'Click to add a new property!' AS description, 
        NULL AS type, 
        NULL AS country, 
        NULL AS state, 
        NULL AS city, 
        NULL AS zip_code, 
        NULL AS address, 
        NULL AS map_link
      UNION ALL
      SELECT 
        id, 
        name, 
        description, 
        type, 
        country, 
        state, 
        city, 
        zip_code, 
        address, 
        map_link
      FROM property.properties 
      WHERE parent_id = $1;
    `;
    const { rows } = await pool.query(query, [parentId]);
    return rows;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw new Error('Failed to retrieve properties.');
  }
}

export async function getPropertyUnits(parentId: number, propertyid?: number): Promise<any[]> {
  try {
    const query = `
      SELECT
        $2::bigint AS property_id,  
        'Add Property' AS property_name,
        0 AS unit_id,
        'Add Unit' AS name,
        0 AS tenant_id,
        NULL AS bedroom,
        NULL AS baths,
        NULL AS kitchen,
        NULL AS rent,
        NULL AS deposit_amount,
        NULL AS rent_type,
        NULL AS rent_duration,
        NULL AS deposit_type,
        NULL AS start_date,
        NULL AS end_date,
        'Click to add a new unit!' AS notes
      UNION ALL
      SELECT
        p.id AS property_id,
        p.name AS property_name,
        pu.id AS unit_id,
        pu.name,
        pu.parent_id AS tenant_id,
        pu.bedroom,
        pu.baths,
        pu.kitchen,
        pu.rent,
        pu.deposit_amount,
        pu.rent_type,
        pu.rent_duration,
        pu.deposit_type,
        pu.start_date,
        pu.end_date,
        pu.notes
      FROM property.properties p
      JOIN property.property_units pu ON p.id = pu.property_id
      WHERE p.parent_id = $1::bigint
        AND pu.property_id = coalesce($2::bigint, pu.property_id);
    `;
    const { rows } = await pool.query(query, [parentId, propertyid]);
    console.log("Database Query Result:", rows);
    return rows;
  } catch (error) {
    console.error("Error fetching property units:", error);
    throw new Error("Failed to retrieve property units.");
  }
}

export async function getTenants(parentId: number, unitId?: number): Promise<TenantDetails[]> {
  const query = `
    SELECT
      0::bigint AS user_id,
      'Add New Tenant'::text AS user_first_name,
      ''::text AS user_last_name,
      ''::text AS user_email,
      ''::text AS user_phone_number,
      COALESCE($2::bigint, 0::bigint) AS property_id,
      ''::text AS property_name,
      COALESCE($2::bigint, 0::bigint) AS unit_id,
      ''::text AS unit_name,
      NULL::numeric AS unit_rent,
      ''::text AS unit_rent_type
    UNION ALL
    SELECT
      u.id::bigint AS user_id,
      u.first_name::text AS user_first_name,
      COALESCE(u.last_name, '')::text AS user_last_name,
      u.email::text AS user_email,
      COALESCE(u.phone_number, '')::text AS user_phone_number,
      p.id::bigint AS property_id,
      p.name::text AS property_name,
      pu.id::bigint AS unit_id,
      pu.name::text AS unit_name,
      pu.rent::numeric AS unit_rent,
      COALESCE(pu.rent_type, '')::text AS unit_rent_type
    FROM public.users u
    JOIN property.property_units pu ON u.id = pu.parent_id
    JOIN property.properties p ON p.id = pu.property_id
    WHERE u.parent_id = $1::bigint
      AND pu.id = COALESCE($2::bigint, pu.id)
      AND u."type" = 'tenant';
  `;

  try {
    // Pass unitId if provided; otherwise, pass null.
    const { rows } = await pool.query(query, [parentId, unitId ?? null]);
    console.log("Database Query Result:", rows);
    return rows;
  } catch (error) {
    console.error("Error fetching tenants:", error);
    throw new Error("Failed to retrieve tenants.");
  }
}

export interface InvoiceDetails {
  id: number;
  tenant_id: number;
  parent_id: number;
  invoice_id: string;
  description: string;
  amount: number;
  dated: string;
}

export async function getPaidInvoices(tenantId: number, parentId: number): Promise<InvoiceDetails[]> {
  const query = `
    SELECT 
      ii.id,
      u.parent_id AS tenant_id, 
      p.parent_id AS parent_id,
      CAST(i.id AS TEXT) AS invoice_id,
      ii.description, 
      ii.amount, 
      to_char(i.created_at, 'Month DD, YYYY') AS dated
    FROM invoices.invoices i
    JOIN property.property_units u ON i.unit_id = u.id
    JOIN property.properties p ON i.property_id = p.id
    JOIN invoices.invoice_items ii ON i.id = ii.invoice_id
    WHERE i.status::text = 'Paid'::text
      AND u.parent_id = $1
      AND p.parent_id = $2;
  `;
  try {
    const result = await pool.query(query, [tenantId, parentId]);
    console.log("Database Query Result:", result.rows);
    return result.rows;
  } catch (error) {
    console.error("SQL Query Error:", error);
    throw new Error("Failed to retrieve paid invoices.");
  }
}


export async function getType(parentId: number, type: string): Promise<string[]> {
  const query = `
    SELECT DISTINCT id, title FROM "types" t
    WHERE parent_id IN (0, $1)
      AND t."type" = $2
    ORDER BY t.id;
  `;
  try {
    const result = await pool.query(query, [parentId, type]);
    return result.rows.map(row => row.title);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

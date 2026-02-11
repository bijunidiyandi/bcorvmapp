import { getAuthHeaders ,getLoggedInUserName} from './auth.api';
import { jwtDecode } from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const COMPANY_ID = process.env.EXPO_PUBLIC_COMPANY_ID;
const SITE_ID = process.env.EXPO_PUBLIC_SITE_ID;
interface DecodedToken {
  given_name: string;
  email: string;
}
let AsyncStorage: any;
if (typeof window === 'undefined') {
  // For React Native
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}
export async function getToken(key: string) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

// export async function getLoggedInUserName(): Promise<string> {
//   try {
//     const token = await getToken('auth_token');
//     if (!token) return 'system';

//     const decoded: any = jwtDecode(token);
//     return decoded?.userName || decoded?.userName || 'system';
//   } catch {
//     return 'system';
//   }
// }
// Common fetch wrapper
async function handleResponse(response: Response, entity: string) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to process ${entity}`);
  }

  // 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  // Fallback (plain text or empty)
  const text = await response.text();
  return text ? { message: text } : { success: true };
}


// GET
export async function fetchEntity(entity: string) {
  try {
    if (!COMPANY_ID) {
      throw new Error('COMPANY_ID not configured');
    }

    const url = `${API_URL}/${entity}/${COMPANY_ID}`;

    console.log('GET', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: '*/*',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
 
    return handleResponse(response, entity);

  } catch (error) {
    console.error(`Error fetching ${entity}:`, error);
    throw error;
  }
}


export async function createEntity(entity: string, data: any) {
  const userName = await getLoggedInUserName();
  const currentTime = new Date().toISOString();

  if (!COMPANY_ID || !SITE_ID) {
    throw new Error('COMPANY_ID or SITE_ID not configured');
  }

  const payload = {
    ...data,
    compID: COMPANY_ID,
    siteID: SITE_ID,
    LastModifiedBy: userName,
    lastModifiedOn: currentTime,
    active: true,
  };

  const url = `${API_URL}/${entity}`;

  console.log('POST', url, payload);

  try {
    const headers = await getAuthHeaders(); // include JWT token if available

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return await handleResponse(response, entity);
  } catch (error: any) {
    console.error(`Web API create failed for ${entity}:`, error);
    // Optional: trigger offline queue / retry logic here
    throw error;
  }
}

// export async function createEntity(entity: string, data: any) {
//   const userName = await getLoggedInUserName();
//   const currentTime = new Date().toISOString();

//   if (!COMPANY_ID || !SITE_ID) {
//     throw new Error('COMPANY_ID or SITE_ID not configured');
//   }

//   const payload = {
//     ...data,
//     compID: COMPANY_ID,
//     siteID: SITE_ID,
//     lastModifiedBy: userName,
//     lastModifiedOn: currentTime,
//     active: true
//   };

//   const url = `${API_URL}/${entity}?user=${encodeURIComponent(userName)}`;

//   console.log('POST', url, payload);
//  const headers = await getAuthHeaders(); // include JWT token if available

//   const response = await fetch(url, {
//     method: 'POST',
//     headers,
//     body: JSON.stringify(payload)
//   });

//   return await handleResponse(response, entity);
// }
  

export async function updateEntity(entity: string, code: string, data: any) {
  const userName = await getLoggedInUserName();
  const currentTime = new Date().toISOString();

  if (!COMPANY_ID || !SITE_ID) {
    throw new Error('COMPANY_ID or SITE_ID not configured');
  }

  const payload = {
    ...data,
    compID: COMPANY_ID, // sent in header too
    siteID: SITE_ID,
    lastModifiedBy: userName,
    lastModifiedOn: currentTime,
    active: data.active ?? true,
  };

  const url = `${API_URL}/${entity}/${encodeURIComponent(code)}`;

  console.log('PUT', url, payload);

  try {
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json-patch+json',
        'CompID': COMPANY_ID, // ✅ header required by API
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 204) {
      return { success: true };
    }

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return { success: true };
    }

    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  } catch (error: any) {
    console.error(`Error updating ${entity}:`, error);
    throw error;
  }
}


export async function patchEntity(entity: string, id: string, data: any) {
  const userName = getLoggedInUserName();
  const currentTime = new Date().toISOString();

  const payload = {
    ...data,
    lastModifiedBy: userName,
    lastModifiedOn: currentTime,
  };

  try {
    const response = await fetch(`${API_URL}/${entity}?code=${id}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'accept': '*/*',
        'compid': COMPANY_ID || '',
        'Content-Type': 'application/json-patch+json'
      },
      body: JSON.stringify(payload)
    });

    // Handle 204 No Content response
    if (response.status === 204) {
      return { status: 'success' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    // Only try to parse JSON if there's content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return { status: 'success' };
  } catch (error) {
    console.error(`Error patching ${entity}:`, error);
    throw error;
  }
}

export async function deleteEntity(entity: string, id: string) {
  const token = localStorage.getItem('token'); // Or your token storage method
  const compId = '70e18930-f385-448c-b2d8-054cf6138c5e'; // Or get from storage

  try {
    const response = await fetch(`${API_URL}/${entity}?code=${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'accept': '*/*',
        'compid': compId,
    
        'Content-Type': 'application/json' // Added for consistency
      }
    });

    // Handle 204 No Content response
    if (response.status === 204) {
      return { success: true, message: 'Item deleted successfully' };
    }

    // Handle other successful responses (if API returns content)
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return { success: true };
    }

    // Handle errors
    const errorData = await response.text();
    throw new Error(errorData || `Delete failed with status ${response.status}`);

  } catch (error) {
    console.error(`Error deleting ${entity} with ID ${id}:`, error);
    
    // Enhance error with more context
    const enhancedError = new Error(
      `Failed to delete ${entity}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    
    // Preserve stack trace if available
    if (error instanceof Error) {
      enhancedError.stack = error.stack;
    }
    
    throw enhancedError;
  }
}

export async function fetchMenuCategories(entity: string) {
  try {
    const response = await fetch(`${API_URL}/${entity}`, {
      headers: {
        ...getAuthHeaders(),
        'compid': COMPANY_ID || '',
        'accept': 'application/json'
      }
    });



    const categories= await handleResponse(response, entity);

        if (Array.isArray(categories) && categories.length > 0) {
          const data = categories.map((cat) => ({
            value: cat.inventoryCatCode,
            label: cat.inventoryCatName,
          }));
          return data;
        }
        console.log('fetchMenuCategories')
   }catch (error) {
    console.error(`Error fetching ${entity}:`, error);
    throw error;
  }
}
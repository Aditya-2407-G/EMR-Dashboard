/**
 * Simple API request utility for data fetching
 * Provides basic error handling and request formatting
 */

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Generic API request function
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url - Request URL
 * @param data - Optional request body data
 * @returns Promise<Response>
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Simple GET request with error handling
 * @param url - Request URL
 * @returns Promise<T> - Parsed JSON response
 */
export async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

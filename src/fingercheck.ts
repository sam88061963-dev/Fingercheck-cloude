const BASE_URL = process.env.FINGERCHECK_BASE_URL ?? "https://developer.fingercheck.com/api";

function credentials() {
  const apiKey = process.env.FINGERCHECK_API_KEY;
  const clientSecret = process.env.FINGERCHECK_CLIENT_SECRET_KEY;
  if (!apiKey || !clientSecret) throw new Error("Fingercheck credentials are not configured.");
  return { apiKey, clientSecret };
}

export async function fingercheckGet(path: string, params: Record<string, string> = {}) {
  const { apiKey, clientSecret } = credentials();
  const url = new URL(`${BASE_URL}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: {
      APIKEY: apiKey,
      ClientSecretKey: clientSecret,
      Accept: "application/json"
    }
  });

  if (!response.ok) throw new Error(`Fingercheck API returned ${response.status}`);
  return response.json();
}

const sensitiveKeys = new Set([
  "SSN", "DOB", "Address1", "Address2", "Phone", "MobilePhone", "PersonalEmail", "EETaxType"
]);

export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !sensitiveKeys.has(key))
      .map(([key, val]) => [key, sanitize(val)]));
  }
  return value;
}

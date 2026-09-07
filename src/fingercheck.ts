const BASE_URL = process.env.FINGERCHECK_BASE_URL ?? "https://developer.fingercheck.com/api";

export type FingercheckAccount = "account1" | "account2";

function credentials(account: FingercheckAccount) {
  const prefix = account === "account1" ? "FINGERCHECK_ACCOUNT_1" : "FINGERCHECK_ACCOUNT_2";
  const apiKey = process.env[`${prefix}_API_KEY`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET_KEY`];
  if (!apiKey || !clientSecret) {
    throw new Error(`Fingercheck credentials are not configured for ${account}.`);
  }
  return { apiKey, clientSecret };
}

export async function fingercheckGet(
  account: FingercheckAccount,
  path: string,
  params: Record<string, string> = {}
) {
  const { apiKey, clientSecret } = credentials(account);
  const url = new URL(`${BASE_URL}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: {
      APIKEY: apiKey,
      ClientSecretKey: clientSecret,
      Accept: "application/json"
    }
  });

  if (!response.ok) throw new Error(`Fingercheck API returned ${response.status} for ${account}`);
  return response.json();
}

export async function fingercheckGetBoth(path: string, params: Record<string, string> = {}) {
  const accounts: FingercheckAccount[] = ["account1", "account2"];
  const results = await Promise.allSettled(accounts.map(account => fingercheckGet(account, path, params)));
  return results.map((result, index) => ({
    account: accounts[index],
    ...(result.status === "fulfilled"
      ? { ok: true, data: result.value }
      : { ok: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) })
  }));
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

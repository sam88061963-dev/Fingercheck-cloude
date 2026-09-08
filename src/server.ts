import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { fingercheckGet, fingercheckGetBoth, sanitize, type FingercheckAccount } from "./fingercheck.js";

const app = express();
app.use(express.json());

const accountSchema = z.enum(["account1", "account2", "both"]).default("both");
type AccountSelection = z.infer<typeof accountSchema>;

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(sanitize(data), null, 2) }] };
}

async function getForSelection(account: AccountSelection, path: string, params: Record<string, string> = {}) {
  if (account === "both") return fingercheckGetBoth(path, params);
  return { account, data: await fingercheckGet(account as FingercheckAccount, path, params) };
}

function buildServer() {
  const server = new McpServer({ name: "fingercheck-claude-mcp", version: "0.2.0" });

  server.tool("fingercheck_list_active_employees", "List active Fingercheck employees from one account or both.", {
    account: accountSchema
  }, async ({ account }) => jsonResult(await getForSelection(account, "v1/Employees/GetAllActiveEmployees")));

  server.tool("fingercheck_get_employee", "Get an employee by employee number from one account or both.", {
    account: accountSchema, employeeNumber: z.string().min(1)
  }, async ({ account, employeeNumber }) => jsonResult(await getForSelection(account, `v1/Employees/GetEmployeeByEmployeeNumber/${encodeURIComponent(employeeNumber)}`)));

  server.tool("fingercheck_get_paid_hours", "Get paid hours for a date range from one account or both.", {
    account: accountSchema, startDate: z.string(), endDate: z.string()
  }, async ({ account, startDate, endDate }) => jsonResult(await getForSelection(account, "v1/Reports/GetAllPaidHoursForDateRange", { startDate, endDate })));

  server.tool("fingercheck_get_employee_paid_hours", "Get paid hours for one employee and date range from one account or both.", {
    account: accountSchema, startDate: z.string(), endDate: z.string(), employeeNumber: z.string().min(1)
  }, async ({ account, startDate, endDate, employeeNumber }) => jsonResult(await getForSelection(account, "v1/Reports/GetAllPaidHoursForDateRangeByEmployeeNumber", { startDate, endDate, employeeNumber })));

  server.tool("fingercheck_get_timecards", "Get timecards for a date range from one account or both.", {
    account: accountSchema, startDate: z.string(), endDate: z.string()
  }, async ({ account, startDate, endDate }) => jsonResult(await getForSelection(account, "v1/Reports/GetAllTimeCardsForDateRange", { startDate, endDate })));

  server.tool("fingercheck_get_employee_timecards", "Get timecards for one employee and date range from one account or both.", {
    account: accountSchema, startDate: z.string(), endDate: z.string(), employeeNumber: z.string().min(1)
  }, async ({ account, startDate, endDate, employeeNumber }) => jsonResult(await getForSelection(account, "v1/Reports/GetAllTimeCardsForDateRangeByEmployeeNumber", { startDate, endDate, employeeNumber })));

  server.tool("fingercheck_get_live_status", "Get Fingercheck live employee status for a date from one account or both.", {
    account: accountSchema, date: z.string()
  }, async ({ account, date }) => jsonResult(await getForSelection(account, "v1/Reports/GetLiveStatusByDate", { date })));

  return server;
}

app.get("/", (_req, res) => res.json({
  ok: true,
  service: "fingercheck-claude-mcp",
  version: "0.2.0",
  accounts: 2,
  health: "/health",
  mcp: "/mcp"
}));

app.get("/health", (_req, res) => res.json({ ok: true, service: "fingercheck-claude-mcp", version: "0.2.0", accounts: 2 }));

app.all("/mcp", async (req, res) => {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (expected && req.headers.authorization !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  res.on("close", () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Fingercheck Claude MCP listening on ${port}`));

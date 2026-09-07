# Fingercheck Claude MCP

A small read-only MCP bridge that lets Claude/Cowork securely read Fingercheck data for reconciliation workflows.

## Intended workflow

1. Cowork opens email and reads/downloads a labor report PDF.
2. Claude extracts employee/date/job/hours.
3. Claude calls this Fingercheck MCP.
4. Claude compares the email report with Fingercheck.
5. Claude flags mismatches.
6. Claude writes the final reconciliation to Google Sheets.

The MCP itself does **not** write to Google Sheets and does **not** modify Fingercheck.

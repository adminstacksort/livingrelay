# Demo V1

This is the reference demo for RelayDesk.

## Purpose

Show the complete maintenance coordination loop on one screen:

1. Tenant submits an issue.
2. AI triages trade, urgency, confidence, and estimated cost.
3. Property manager reviews and approves dispatch.
4. Owner approval is requested when the property rules require it.
5. Vendor coordination message is generated.
6. Tenant receives status updates.
7. Timeline records the work order history.

## Intentional Simplifications

- Single-page app.
- No backend.
- No authentication.
- No SMS delivery.
- No real AI API calls.
- No persistent database.
- No payment processing.
- No invoice storage.

The demo should remain useful for showing the product concept quickly. The production app should separate tenant, manager, owner, and vendor experiences.

## Demo URL

Run the dev server and open:

```text
http://127.0.0.1:5173/
```

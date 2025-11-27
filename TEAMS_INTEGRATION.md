# Microsoft Teams Integration Setup Guide

This guide explains how to set up automatic meeting capture and sync between Microsoft Teams and ActionFlow.

## Overview

The Teams integration uses webhooks to automatically:
- Capture meeting events (created, updated, deleted)
- Sync meeting information to your ActionFlow workspace
- Track meeting schedules and participants
- Enable AI transcription and task extraction

## Prerequisites

- Microsoft 365 account with admin permissions
- Access to Microsoft Teams Admin Center
- ActionFlow account with an active workspace

## Setup Steps

### 1. Enable Integration in ActionFlow

1. Log in to your ActionFlow dashboard
2. Navigate to **Integrations** from the dashboard
3. Click **Enable Microsoft Teams**
4. Copy the provided webhook URL

### 2. Register App in Microsoft Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory → App registrations**
3. Click **New registration**
4. Set up your app:
   - **Name**: ActionFlow Teams Integration
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Leave blank for now
5. Click **Register**

### 3. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission → Microsoft Graph → Application permissions**
3. Add these permissions:
   - `Calendars.Read` - Read calendars in all mailboxes
   - `OnlineMeetings.Read.All` - Read online meeting details
   - `User.Read.All` - Read all users' full profiles
4. Click **Grant admin consent** for your organization

### 4. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set description and expiration
4. Copy the secret value (you won't see it again!)

### 5. Set Up Webhook Subscription

You have two options:

#### Option A: Using Microsoft Graph API

Make a POST request to create a subscription:

```bash
POST https://graph.microsoft.com/v1.0/subscriptions
Content-Type: application/json

{
  "changeType": "created,updated,deleted",
  "notificationUrl": "YOUR_WEBHOOK_URL_FROM_ACTIONFLOW",
  "resource": "users/{userId}/events",
  "expirationDateTime": "2024-12-31T23:59:59.0000000Z",
  "clientState": "secretClientValue"
}
```

#### Option B: Using Microsoft Teams Admin Center

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com/)
2. Navigate to **Teams apps → Manage apps**
3. Click **Upload** and create a custom app
4. Configure the app manifest with webhook URL
5. Install the app for your organization

### 6. Validate Webhook

When Microsoft Teams first connects to your webhook, it sends a validation request:

```
GET {your-webhook-url}?validationToken={token}
```

The ActionFlow webhook automatically handles this validation by echoing back the token.

## Webhook Events

The integration listens for these Microsoft Graph events:

### Meeting Created
```json
{
  "changeType": "created",
  "resourceData": {
    "@odata.type": "#microsoft.graph.event",
    "id": "meeting-id",
    "subject": "Team Sync",
    "start": { "dateTime": "2024-01-15T14:00:00" },
    "end": { "dateTime": "2024-01-15T15:00:00" }
  }
}
```

### Meeting Updated
Similar structure with `changeType: "updated"`

### Meeting Deleted
Similar structure with `changeType: "deleted"`

## Security

- Webhook endpoint is public but should be secured with:
  - Client state validation
  - IP allowlisting (Teams IP ranges)
  - HTTPS only
- All sensitive data stored in Supabase with RLS
- Service account handles database operations

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct and accessible
2. Verify app permissions are granted
3. Check subscription status in Azure
4. Review ActionFlow edge function logs

### Meetings Not Appearing

1. Ensure workspace is properly set up
2. Check database RLS policies
3. Verify user has workspace access
4. Review meeting creation logs

### Permission Errors

1. Confirm admin consent was granted
2. Check app has required Graph API permissions
3. Verify app is installed in organization

## Best Practices

1. **Subscription Renewal**: Graph API subscriptions expire. Set up automatic renewal
2. **Error Handling**: Monitor webhook failures and retry logic
3. **Rate Limits**: Respect Microsoft Graph API rate limits
4. **Testing**: Use test meetings before production rollout
5. **Monitoring**: Track webhook health and success rates

## API Reference

### Webhook Endpoint

```
POST /functions/v1/teams-webhook
```

**Response Codes:**
- `200 OK` - Event processed successfully
- `400 Bad Request` - Invalid payload
- `500 Internal Server Error` - Processing error

### Integration Status

Check integration status:
```sql
SELECT * FROM integrations 
WHERE integration_type = 'teams' 
AND workspace_id = 'your-workspace-id';
```

## Support

For issues with:
- **Microsoft Teams setup**: Contact Microsoft support
- **ActionFlow integration**: Check edge function logs in Supabase
- **Webhook connectivity**: Verify network and firewall settings

## Additional Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [Webhooks and Subscriptions](https://docs.microsoft.com/en-us/graph/webhooks)
- [Teams App Development](https://docs.microsoft.com/en-us/microsoftteams/platform/)

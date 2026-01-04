# WhatsApp Webhook with Versioning

## ✅ Webhook Moved to Versioned Path

The WhatsApp webhook endpoint now includes API versioning for better maintainability and future compatibility.

## New Endpoint (v1)

### **URL Path**
```
/bridge/webhook/v1/whatsapp/getmessages
```

### **Full URL**
```
https://your-domain.com/bridge/webhook/v1/whatsapp/getmessages
```

### **File Location**
```
src/app/bridge/webhook/v1/whatsapp/getmessages/route.ts
```

## Versioning Strategy

### **Current Version: v1**

The `/v1/` prefix allows for:
- **Backward compatibility** when introducing breaking changes
- **Gradual migration** from old to new versions
- **Multiple versions** running simultaneously
- **Clear API evolution** tracking

### **Future Versions**

When you need to make breaking changes:
```
/bridge/webhook/v1/whatsapp/getmessages  ← Current (stable)
/bridge/webhook/v2/whatsapp/getmessages  ← Future (new features)
/bridge/webhook/v3/whatsapp/getmessages  ← Future (major changes)
```

## Endpoints Available

### **1. POST - Receive Messages**
```
POST /bridge/webhook/v1/whatsapp/getmessages
```

**Purpose**: Receives incoming WhatsApp messages from Meta

**Request Body**: WhatsApp webhook payload (JSON)

**Response**:
```json
{
  "status": "success",
  "message": "Message received and processed"
}
```

### **2. GET - Webhook Verification**
```
GET /bridge/webhook/v1/whatsapp/getmessages?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

**Purpose**: Verifies webhook with Meta during setup

**Response**: Returns the challenge string

## Configuration

### **Meta App Dashboard Setup**

1. **Navigate to**: App Dashboard > WhatsApp > Configuration

2. **Set Webhook URL**:
   ```
   https://your-domain.com/bridge/webhook/v1/whatsapp/getmessages
   ```

3. **Set Verify Token**:
   ```
   neup_meta_webhook_verify_token_2024
   ```

4. **Subscribe to Fields**:
   - ✅ `messages` (for incoming messages)

5. **Click "Verify and Save"**

## Directory Structure

```
src/app/bridge/webhook/
├── v1/
│   └── whatsapp/
│       └── getmessages/
│           └── route.ts       ← Current version
├── v2/                        ← Future version
│   └── whatsapp/
│       └── getmessages/
│           └── route.ts
└── route.ts                   (generic webhook)
```

## Version History

### **v1 (Current)**
- ✅ Webhook verification
- ✅ Message receiving
- ✅ Text message support
- ✅ Firebase integration
- ✅ Conversation management
- ✅ Error logging

### **v2 (Future)**
Potential features:
- Media message support
- Message status webhooks
- Template webhooks
- Account alerts
- Enhanced security (mTLS)

## Benefits of Versioning

### **1. Stability**
- v1 remains stable while developing v2
- No breaking changes for existing integrations
- Clients can upgrade at their own pace

### **2. Testing**
- Test new features in v2 without affecting v1
- A/B testing between versions
- Gradual rollout of new features

### **3. Deprecation**
- Clear deprecation path
- Time for clients to migrate
- Support multiple versions during transition

### **4. Documentation**
- Version-specific documentation
- Clear changelog between versions
- Easy to track API evolution

## Migration Path

### **From Old Endpoints**

**Old (No Version)**:
```
❌ /bridge/whatsapp/get-messages
❌ /bridge/webhook/whatsapp/getmessages
```

**New (Versioned)**:
```
✅ /bridge/webhook/v1/whatsapp/getmessages
```

### **Future Migration (v1 to v2)**

When v2 is ready:
1. Keep v1 running
2. Deploy v2 alongside v1
3. Update documentation
4. Notify clients of new version
5. Set deprecation timeline for v1
6. Monitor v2 adoption
7. Eventually sunset v1

## Testing

### **Test Verification**

```bash
curl "https://your-domain.com/bridge/webhook/v1/whatsapp/getmessages?hub.mode=subscribe&hub.verify_token=neup_meta_webhook_verify_token_2024&hub.challenge=test123"
```

**Expected Response**: `test123`

### **Test Message Reception**

Send a WhatsApp message to your business number and verify:
- ✅ Console logs show webhook payload
- ✅ Message appears in Firebase
- ✅ Conversation updates in inbox UI

## API Versioning Best Practices

### **1. Semantic Versioning**
- **v1**: Major version 1
- **v1.1**: Minor update (backward compatible)
- **v1.1.1**: Patch (bug fixes)

### **2. Version in URL**
- ✅ `/v1/` in path (current approach)
- Alternative: Header-based versioning
- Alternative: Query parameter versioning

### **3. Deprecation Policy**
- Announce deprecation early
- Provide migration guide
- Support old version for transition period
- Set clear sunset date

### **4. Documentation**
- Version-specific docs
- Changelog for each version
- Migration guides
- Breaking changes highlighted

## Future Webhook Endpoints

With versioning in place, you can easily add:

```
/bridge/webhook/v1/
├── whatsapp/getmessages       ← Current
├── facebook/getmessages       ← Future
├── instagram/getmessages      ← Future
├── twitter/getmessages        ← Future
└── linkedin/getmessages       ← Future
```

## Status

✅ **Webhook moved** to versioned path
✅ **v1 endpoint active** at `/bridge/webhook/v1/whatsapp/getmessages`
✅ **Application compiling** successfully
✅ **Ready for configuration** in Meta App Dashboard
✅ **Future-proof** for API evolution

## Next Steps

1. **Update Meta App Dashboard**:
   - Change webhook URL to new versioned endpoint
   - Re-verify webhook

2. **Test the endpoint**:
   - Send test message
   - Verify processing works

3. **Update documentation**:
   - API docs with versioned URLs
   - Integration guides
   - Developer portal

4. **Plan for v2**:
   - List desired features
   - Design breaking changes
   - Create migration strategy

## Important Notes

### **URL Format**
```
/bridge/webhook/v1/whatsapp/getmessages
         ↑       ↑     ↑         ↑
      bridge  webhook  v1    platform/action
```

### **Consistency**
- All webhooks should use versioning
- Consistent version format across platforms
- Clear version documentation

### **Backward Compatibility**
- v1 will remain stable
- No breaking changes in v1
- New features go to v2

## Summary

**Previous**: `/bridge/webhook/whatsapp/getmessages`
**Current**: `/bridge/webhook/v1/whatsapp/getmessages`

The webhook now includes **API versioning** for better maintainability and future compatibility! 🎉

### **Key Benefits**
- ✅ Future-proof API design
- ✅ Smooth version transitions
- ✅ No breaking changes for existing clients
- ✅ Clear deprecation path
- ✅ Better documentation

Update your Meta App Dashboard configuration to use the new versioned URL!

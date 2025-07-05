# TalkJS Troubleshooting Guide - 400 Status Code Error

## Error Analysis
You're experiencing: `Failed to manage TalkJS conversation 'customer-686950b40c47ebf928d9e401-admin-686950ca0c47ebf928d9e404': Request failed with status code 400`

## Common Causes of TalkJS 400 Errors

### 1. **Invalid User IDs**
TalkJS has specific requirements for user IDs:
- Must be alphanumeric (letters, numbers, hyphens, underscores only)
- Cannot start with a number
- Maximum length: 50 characters
- Your conversation ID includes MongoDB ObjectIds which are valid

### 2. **Missing Required User Properties**
When creating users in TalkJS, certain fields are required:
```javascript
// Required fields for TalkJS user creation
{
  id: "customer-686950b40c47ebf928d9e401", // Must be unique
  name: "Customer Name",               // Required
  email: "customer@example.com",       // Required for most operations
  role: "default"                      // Optional but recommended
}
```

### 3. **Duplicate User Creation**
TalkJS returns 400 if you try to create a user that already exists with different properties. Solution:
- Use `createOrUpdateUser` instead of `createUser`
- Or check if user exists before creating

### 4. **Invalid Conversation ID Format**
Your conversation ID format looks correct, but ensure:
- Conversation IDs follow the same rules as user IDs
- They're unique across your application
- No special characters except hyphens and underscores

### 5. **Authentication Issues**
- Verify your TalkJS App ID is correct
- Check if your secret key is properly configured
- Ensure the API key has the right permissions

## Recommended TalkJS Implementation

Here's how you should implement TalkJS in your NestJS application:

### 1. Install TalkJS SDK
```bash
npm install talkjs
```

### 2. Create TalkJS Service

```typescript
// talkjs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Talk from 'talkjs';

@Injectable()
export class TalkjsService {
  private readonly logger = new Logger(TalkjsService.name);
  private talkSession: Talk.Session;

  constructor(private configService: ConfigService) {
    Talk.ready.then(() => {
      this.talkSession = new Talk.Session({
        appId: this.configService.get('TALKJS_APP_ID'),
        me: new Talk.User({
          id: 'system',
          name: 'System',
          role: 'default'
        })
      });
    });
  }

  async createOrUpdateUser(userdata: {
    id: string;
    name: string;
    email: string;
    role?: string;
  }) {
    try {
      const user = new Talk.User({
        id: userdata.id,
        name: userdata.name,
        email: userdata.email,
        role: userdata.role || 'default'
      });
      
      return user;
    } catch (error) {
      this.logger.error(`Failed to create/update TalkJS user ${userdata.id}`, error);
      throw error;
    }
  }

  async createConversation(conversationId: string, participants: string[]) {
    try {
      const conversation = this.talkSession.getOrCreateConversation(conversationId);
      
      // Add participants
      for (const participantId of participants) {
        const user = await this.getUserById(participantId);
        conversation.setParticipant(user);
      }
      
      return conversation;
    } catch (error) {
      this.logger.error(`Failed to create TalkJS conversation ${conversationId}`, error);
      throw error;
    }
  }

  private async getUserById(userId: string) {
    // Fetch user data from your database
    // Then create TalkJS user
    return new Talk.User({
      id: userId,
      name: 'User Name', // Get from your DB
      email: 'user@email.com', // Get from your DB
      role: 'default'
    });
  }
}
```

## Debugging Steps

### 1. **Check User Data Integrity**
Verify that both customer and admin users exist in your database:
```bash
# Check in MongoDB
db.users.findOne({_id: ObjectId("686950b40c47ebf928d9e401")})
db.users.findOne({_id: ObjectId("686950ca0c47ebf928d9e404")})
```

### 2. **Validate TalkJS Configuration**
```typescript
// Add this to your TalkJS service for debugging
async validateConfiguration() {
  try {
    const response = await fetch(`https://api.talkjs.com/v1/${this.appId}/users/test`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com'
      })
    });
    
    if (!response.ok) {
      this.logger.error(`TalkJS API test failed: ${response.status} ${response.statusText}`);
    } else {
      this.logger.log('TalkJS API connection successful');
    }
  } catch (error) {
    this.logger.error('TalkJS API connection failed', error);
  }
}
```

### 3. **Log Request Details**
Add detailed logging to see exactly what's being sent:
```typescript
this.logger.debug(`Creating conversation with ID: ${conversationId}`);
this.logger.debug(`Participants: ${JSON.stringify(participants)}`);
```

## Environment Variables Required
Make sure these are set in your `.env` file:
```env
TALKJS_APP_ID=your_app_id_here
TALKJS_SECRET_KEY=your_secret_key_here
```

## Next Steps

1. **Implement the TalkJS service** using the code above
2. **Verify user data** exists in your database for both IDs in the error
3. **Check TalkJS dashboard** for any API limits or account issues
4. **Add debug logging** to see the exact request being made
5. **Test with simple user IDs** first (e.g., "customer1", "admin1") to rule out ID format issues

## Common TalkJS 400 Error Messages

- `"Invalid user id"` - User ID format is wrong
- `"Missing required field 'name'"` - User object missing name property
- `"Invalid email address"` - Email format is incorrect
- `"User already exists"` - Trying to create existing user with different properties

The specific error you're seeing suggests an issue with the conversation creation request format or the user data being passed to TalkJS.
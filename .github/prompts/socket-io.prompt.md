# Socket.IO Integration Guidelines with Hono.js

## Basic Setup

1. Installation Requirements:
```bash
pnpm install socket.io @hono/node-server
```

2. Initial Configuration:
```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Server } from 'socket.io'

const app = new Hono()
const server = serve(app)
const io = new Server(server)
```

## Implementation Guidelines

1. Event Naming Conventions:
- Use camelCase for event names
- Prefix events by feature/module
- Examples:
    - userConnected
    - chatMessage
    - roomJoined

2. Connection Management:
```typescript
io.on('connection', (socket) => {
    // Handle connection logic
    socket.on('disconnect', () => {
        // Clean up resources
    })
})
```

3. Error Handling:
- Implement error events
- Use try-catch blocks
- Emit error responses

4. Room Management:
- Use meaningful room names
- Implement join/leave logic
- Track active rooms

## Best Practices

1. Security:
- Implement authentication
- Validate payloads
- Use proper CORS settings

2. Performance:
- Minimize event emissions
- Use acknowledgments when needed
- Implement heartbeat mechanism

3. Testing:
- Test socket events
- Mock socket connections
- Verify event handlers

## Examples

1. Basic Chat Implementation:
```typescript
io.on('connection', (socket) => {
    socket.on('chatMessage', (message) => {
        io.emit('newMessage', {
            text: message,
            timestamp: new Date()
        })
    })
})
```

Remember to check [Socket.IO documentation](https://socket.io/docs/v4/) for detailed information.
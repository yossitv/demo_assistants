# Embeddable Chat Widget

This directory contains the embeddable chat widget implementation that allows you to integrate the AI chat assistant into external websites via an iframe.

## Overview

The embed feature provides a minimal, iframe-optimized version of the chat interface that can be embedded on any website. It includes:

- Minimal UI with no navigation or surrounding chrome
- Transparent background support for seamless integration
- Optimized spacing and layout for iframe dimensions
- Full chat functionality with the ChatWidget component in embed mode

## Directory Structure

```
app/embed/
├── layout.tsx              # Minimal layout that overrides root layout
├── [agentId]/
│   ├── page.tsx           # Server component with agentId validation
│   └── EmbedChatClient.tsx # Client component with ChatProvider and ChatWidget
└── README.md              # This file
```

## Usage

### Basic Embed

To embed the chat widget on your website, use an iframe with the following structure:

```html
<iframe
  src="https://yourdomain.com/embed/YOUR_AGENT_ID"
  width="400"
  height="600"
  frameborder="0"
  allow="clipboard-write"
  style="border: none; border-radius: 8px;"
></iframe>
```

Replace:
- `https://yourdomain.com` with your actual domain (use `http://localhost:3000` for local development)
- `YOUR_AGENT_ID` with the ID of your agent

### Recommended Dimensions

The chat widget works well with various dimensions:

- **Standard**: 400px × 600px (recommended)
- **Compact**: 350px × 500px
- **Large**: 500px × 700px
- **Full Height**: 400px × 100vh (for sidebar implementations)

### Responsive Embed

For a responsive embed that adapts to container width:

```html
<div style="position: relative; padding-bottom: 150%; height: 0; max-width: 400px;">
  <iframe
    src="https://yourdomain.com/embed/YOUR_AGENT_ID"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    frameborder="0"
    allow="clipboard-write"
  ></iframe>
</div>
```

### Example Page

An example HTML page demonstrating the embed functionality is available at:
- Development: `http://localhost:3000/embed-example.html`
- File location: `/public/embed-example.html`

## Features

### Embed Mode Optimizations

When `embedMode={true}` is set on the ChatWidget, the following optimizations are applied:

1. **Compact Layout**:
   - Reduced padding (p-2 instead of p-4/p-6)
   - No header with title/description
   - Shorter placeholder text

2. **Visual Changes**:
   - No rounded corners or shadow on container
   - Full screen height (h-screen)
   - Minimal footer with "Powered by AI Assistant" branding

3. **Responsive Design**:
   - Adapts to iframe dimensions
   - Maintains functionality across different sizes
   - Optimized message spacing

### Layout Override

The `/app/embed/layout.tsx` file overrides the root layout to provide:
- No Navigation component
- No AgentProvider wrapper (as it's not needed for chat)
- Transparent background support
- Minimal margins and padding

## Implementation Details

### Server Component (`page.tsx`)

The page component:
1. Receives the `agentId` from the dynamic route parameter
2. Validates that `agentId` is not empty
3. Shows an error state if validation fails
4. Renders the `EmbedChatClient` component with the validated `agentId`

### Client Component (`EmbedChatClient.tsx`)

The client component:
1. Wraps the ChatWidget with ChatProvider for state management
2. Passes `embedMode={true}` to enable embed optimizations
3. Uses transparent background for seamless integration
4. Sets full screen height for proper iframe rendering

### State Management

The embed page uses the same `ChatContext` and state management as the regular chat page:
- Message history
- Loading states
- Error handling
- Conversation tracking

## Testing

### Local Testing

1. Start the development server:
   ```bash
   cd web
   npm run dev
   ```

2. Open the example page:
   ```
   http://localhost:3000/embed-example.html
   ```

3. Or directly access the embed route:
   ```
   http://localhost:3000/embed/test-agent-123
   ```

### Production Testing

1. Build and start the production server:
   ```bash
   cd web
   npm run build
   npm start
   ```

2. Test the embed URL with your production domain

### iframe Integration Testing

Create a test HTML file with the iframe embed code and verify:
- Chat widget loads correctly
- Messages can be sent and received
- Error handling works
- Layout adapts to different iframe dimensions
- No scroll issues or overflow problems

## Security Considerations

### CORS and iframe Security

When embedding on external domains, ensure your backend API:
1. Allows cross-origin requests from authorized domains
2. Validates agent IDs properly
3. Implements rate limiting to prevent abuse

### Content Security Policy

If your site uses CSP headers, ensure the iframe source is allowed:

```http
Content-Security-Policy: frame-src https://yourdomain.com
```

### Authentication

The current implementation assumes public agents. If you need authentication:
1. Pass auth tokens via query parameters (not recommended)
2. Use postMessage API for secure token exchange
3. Implement session-based auth on the backend

## Customization

### Styling

To customize the appearance:
1. Modify the ChatWidget component's embed mode styles
2. Adjust colors, spacing, and typography in the component
3. Use CSS variables for consistent theming

### Branding

The embed mode includes a "Powered by AI Assistant" footer. To customize:
- Edit the footer section in `ChatWidget.tsx` (lines 174-181)
- Update the text or remove the footer entirely
- Add your own branding

### Functionality

The embed widget includes all features of the regular chat:
- Message sending/receiving
- Error handling with retry
- Loading indicators
- Message history
- Conversation persistence

## Troubleshooting

### Widget Not Loading

- Check the agent ID is correct
- Verify the embed URL is accessible
- Check browser console for errors
- Ensure CORS is properly configured

### Styling Issues

- Verify iframe dimensions are adequate (minimum 300×400)
- Check for CSS conflicts with parent page
- Use browser DevTools to inspect the iframe

### Communication Issues

- Verify the API endpoint is accessible
- Check network requests in DevTools
- Ensure authentication is working (if required)
- Check for rate limiting or quota issues

## Requirements Covered

This implementation fulfills the following requirements from Task 17:

- ✓ 5.1: Page created at `app/embed/[agentId]/page.tsx`
- ✓ 5.2: ChatWidget rendered with `embedMode={true}`
- ✓ 5.3: Navigation and surrounding UI removed via separate layout
- ✓ 5.4: Transparent background and iframe-optimized styling
- ✓ 5.5: Minimal layout with proper iframe dimensions support

## Related Files

- `/web/components/ChatWidget.tsx` - Main chat widget component
- `/web/lib/context/ChatContext.tsx` - Chat state management
- `/web/app/layout.tsx` - Root layout (overridden by embed layout)
- `/web/public/embed-example.html` - Example implementation

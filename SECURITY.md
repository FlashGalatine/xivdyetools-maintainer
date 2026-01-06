# Security Documentation

> **⚠️ CRITICAL: This is a development-only tool. DO NOT deploy to production.**

## Overview

The XIV Dye Tools Maintainer is a local development tool for managing dye data in the xivdyetools-core library. It is designed to run **ONLY** on a developer's local machine and has **NO** production deployment scenario.

This document outlines the security model, threat assumptions, implemented controls, and known limitations of this development tool.

---

## Threat Model

### Assumptions

1. **Single-User Environment**: This tool runs on a developer's local machine
2. **Trusted User**: The developer running this tool has legitimate access to modify xivdyetools-core data
3. **Local Network Only**: The server binds to 127.0.0.1 (localhost only, no network exposure)
4. **Development Use**: This is NOT a production service and should never be exposed to the internet

### Identified Threats

Even as a local dev tool, we defend against common security issues:

1. **Accidental Production Deployment** - Production environment guard prevents deployment
2. **Path Traversal** - Path validation prevents access outside allowed directories
3. **Resource Exhaustion** - Rate limiting and timeouts prevent runaway operations
4. **Malformed Input** - Zod schema validation ensures data integrity
5. **Timing Attacks** - Timing-safe API key comparison prevents timing-based key guessing
6. **Information Disclosure** - Error sanitization prevents sensitive data leakage
7. **MIME Confusion** - Content-Type validation enforces expected request format
8. **Session Token Spam** - Session creation rate limiting prevents token abuse

---

## Security Controls

### 1. Production Environment Guard

**Location**: `server/api.ts` lines 23-29

**Protection**: Prevents accidental deployment to production environments.

```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Maintainer service must NOT run in production!')
  process.exit(1)
}
```

**Bypass Risk**: Developer could set NODE_ENV to something other than 'production'. This is acceptable for a dev tool.

**Effectiveness**: ✅ Excellent - Server refuses to start in production mode

---

### 2. Network Binding Restriction

**Location**: `server/api.ts` line 226

**Protection**: Server binds ONLY to 127.0.0.1 (localhost), not accessible from network.

```typescript
app.listen(PORT, '127.0.0.1', () => { ... })
```

**Important**: Even on local network, other machines CANNOT access this server.

**Effectiveness**: ✅ Excellent - Prevents network exposure

---

### 3. CORS Restriction

**Location**: `server/api.ts` lines 59-65

**Protection**: Only allows requests from the Vite dev server (http://localhost:5174).

```typescript
app.use(cors({
  origin: 'http://localhost:5174',
  credentials: false,
}))
```

**Limitation**: CORS is a browser security feature. Direct API calls (curl, Postman) bypass CORS.

**Effectiveness**: ✅ Good - Prevents malicious websites from accessing API while server is running

---

### 4. Authentication

**Location**: `server/middleware/auth.ts`

**Methods**:
1. **Session Tokens** (Primary): Frontend obtains ephemeral session tokens that expire after 24 hours
2. **API Key** (Fallback): Optional `MAINTAINER_API_KEY` for direct server calls

**Protection Features**:
- Timing-safe API key comparison prevents timing attacks
- GET requests skip auth (read-only operations are safe)
- Session tokens auto-expire and are cleared on server restart

**Limitation**: For a local dev tool, this is defense-in-depth. The primary security boundary is localhost binding.

**Effectiveness**: ✅ Good - Adds authentication layer without impacting usability

---

### 5. Rate Limiting

**Location**: `server/middleware/rateLimiting.ts`

**Tiers**:
- **Global**: 1000 requests / 15 minutes (prevents runaway loops)
- **Write**: 30 requests / 1 minute (limits file I/O operations)
- **Session**: 10 requests / 15 minutes (prevents token spam)

**Purpose**: Protects against accidental resource exhaustion, not malicious attacks.

**Effectiveness**: ✅ Good - Prevents accidental denial of service from buggy code

---

### 6. Request Timeout

**Location**: `server/middleware/timeout.ts`

**Timeout**: 30 seconds per request

**Purpose**: Prevents hung connections and resource exhaustion.

**Client-Side**: Frontend uses 15s timeout for read operations, 30s for write operations.

**Effectiveness**: ✅ Good - Prevents hung connections

---

### 7. Path Traversal Protection

**Location**: `server/utils/pathValidation.ts`

**Protection**:
- Validates all file paths stay within expected directories
- Prevents access to `../../etc/passwd` style attacks
- Validates core path at startup (server fails fast if misconfigured)
- Runtime validation on all file operations

**Examples Blocked**:
- `/api/locale/../../etc/passwd`
- `/api/locale/../../../sensitive-file`

**Effectiveness**: ✅ Excellent - Comprehensive startup and runtime validation

---

### 8. Input Validation

**Location**: `server/schemas.ts` and `server/middleware/validation.ts`

**Protection**: Zod schemas validate all request bodies against strict schemas.

**Validated Fields**:
- **Dye Data**: Structure, types, itemID, category, name, hex format, RGB/HSV ranges, boolean flags
- **Locale Data**: Code, meta, labels, dyeNames, optional fields

**Error Handling**: Validation errors are sanitized to prevent user input from appearing in error messages.

**Effectiveness**: ✅ Excellent - Comprehensive schema validation with error sanitization

---

### 9. Content-Type Validation

**Location**: `server/middleware/contentType.ts`

**Protection**: Enforces `application/json` Content-Type for mutation operations (POST, PUT, PATCH, DELETE).

**Purpose**: Prevents MIME confusion attacks and ensures proper request parsing.

**Behavior**:
- Validates mutation requests have proper Content-Type header
- Returns 415 Unsupported Media Type if validation fails
- Skips validation for requests with no body (Content-Length: 0)

**Effectiveness**: ✅ Good - Prevents content confusion attacks

---

### 10. Error Sanitization

**Location**: `server/middleware/errorSanitizer.ts`

**Protection**: Converts detailed Zod validation errors to safe error codes and generic messages.

**Prevents**: User-supplied values from appearing in error messages (potential XSS vector).

**Examples**:
- Server log: Full Zod error with user input for debugging
- Client receives: `{ field: "itemID", code: "INVALID_TYPE", message: "Field 'itemID' has invalid type" }`

**Effectiveness**: ✅ Excellent - Prevents information disclosure while maintaining debuggability

---

### 11. Structured Logging & Audit Trail

**Location**: `server/middleware/requestLogger.ts` and `server/utils/logger.ts`

**Logs**:
- All incoming requests with correlation ID
- Request method, path, IP address, user-agent
- Response status and duration
- AUDIT logs for successful mutation operations
- Error logs for failures

**Format**: Structured JSON for easy parsing and filtering.

**Example Log Entry**:
```json
{
  "timestamp": "2026-01-05T12:34:56.789Z",
  "level": "AUDIT",
  "message": "Mutation operation completed",
  "requestId": "a1b2c3d4e5f6g7h8",
  "method": "POST",
  "path": "/api/colors",
  "statusCode": 200,
  "duration": "145ms",
  "ip": "127.0.0.1"
}
```

**Purpose**:
- Debugging and troubleshooting
- Audit trail of data modifications
- Security event tracking

**Effectiveness**: ✅ Excellent - Comprehensive audit trail with correlation IDs

---

### 12. Global Error Handler

**Location**: `server/middleware/errorHandler.ts`

**Protection**: Catches unhandled exceptions and prevents error details from leaking to client.

**Behavior**:
- Logs full error details server-side (including stack trace) for debugging
- Returns generic "Internal server error" to client
- Handles 404 Not Found for undefined routes

**Examples**:
- Server log: Full error with stack trace
- Client receives: `{ "success": false, "error": "Internal server error" }`

**Effectiveness**: ✅ Good - Defense-in-depth error handling

---

## Known Limitations

### 1. No HTTPS

**Risk**: Traffic is unencrypted.

**Mitigation**: Server only binds to localhost (127.0.0.1). Traffic never leaves the machine.

**Acceptable**: HTTPS is unnecessary for localhost-only communication.

---

### 2. API Key in Environment Variables

**Risk**: API key stored in plaintext in .env file.

**Mitigation**:
- File is gitignored
- Only used for optional direct server calls
- Primary authentication is session-based

**Acceptable**: This is a local dev tool with trusted single-user environment.

---

### 3. No Request Size Limits Beyond JSON Body

**Risk**: Large uploads could exhaust memory.

**Mitigation**:
- JSON body limit set to 10MB (reasonable for dye data)
- Rate limiting prevents rapid large requests
- Timeout prevents hung connections

**Acceptable**: Developer is trusted user, won't attack their own machine.

---

### 4. No Input Sanitization for SQL Injection

**Risk**: N/A - This application doesn't use a database.

**Data Storage**: Plain JSON files validated by Zod schemas.

---

### 5. No XSS Protection Headers

**Risk**: Minimal - API returns JSON, not HTML.

**Mitigation**: Frontend (Vue app) handles rendering safely. API never renders user input as HTML.

**Acceptable**: API-only server doesn't serve HTML content.

---

### 6. Limited Logging Retention

**Risk**: Logs are only kept in console output, not persisted to files.

**Mitigation**: For a development tool, console logs are sufficient. Use shell redirection if log persistence is needed:

```bash
npm run dev:server 2>&1 | tee server.log
```

**Acceptable**: Development tool doesn't require long-term log retention.

---

## Security Testing

### Recommended Tests

#### 1. Production Guard Test
```bash
NODE_ENV=production npm run dev:server
# Expected: Server exits with error message
```

#### 2. Path Traversal Test
```bash
curl http://127.0.0.1:3001/api/locale/../../etc/passwd
# Expected: 400 Bad Request (invalid locale code)
```

#### 3. Invalid Content-Type Test
```bash
curl -X POST http://127.0.0.1:3001/api/colors \
  -H "Content-Type: text/plain" \
  -d '[...]'
# Expected: 415 Unsupported Media Type
```

#### 4. Rate Limiting Test
```bash
# Send 40 rapid POST requests
for i in {1..40}; do
  curl -X POST http://127.0.0.1:3001/api/colors \
    -H "Content-Type: application/json" \
    -H "X-Session-Token: valid-token" \
    -d '[]' &
done
wait
# Expected: Some requests receive 429 Too Many Requests
```

#### 5. Timeout Test
Create a large file and attempt to POST it:
```bash
# Expected: 408 Request Timeout after 30 seconds
```

#### 6. Invalid Input Test
```bash
curl -X POST http://127.0.0.1:3001/api/colors \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: valid-token" \
  -d '{"invalid": "data"}'
# Expected: 400 Bad Request with validation error
```

#### 7. Network Access Test
From another device on your network:
```bash
curl http://<your-ip>:3001/api/health
# Expected: Connection refused (server only binds to 127.0.0.1)
```

#### 8. Health Endpoint Information Disclosure Test
```bash
curl http://127.0.0.1:3001/api/health
# Expected: {"status":"ok"}
# Should NOT include corePath or other internal details
```

---

## Reporting Security Issues

This is an open-source local development tool. Security issues should be reported via:

1. **GitHub Issues**: https://github.com/FlashGalatine/xivdyetools-maintainer/issues
2. **Direct Contact**: See README.md for contact information

For responsible disclosure, please:
- Provide clear reproduction steps
- Explain the potential impact
- Allow reasonable time for fixes before public disclosure

---

## Security Checklist

Use this checklist to verify security controls are working:

| Control | Status | Test Method |
|---------|--------|-------------|
| Production Guard | ✅ | Set NODE_ENV=production and verify exit |
| Network Binding | ✅ | Try accessing from another device (should fail) |
| CORS Restriction | ✅ | Check server logs for CORS headers |
| Authentication | ✅ | Try requests without session token (should fail for POST) |
| Rate Limiting | ✅ | Send rapid requests and verify 429 response |
| Request Timeout | ✅ | Create slow operation and verify 408 response |
| Path Traversal | ✅ | Try ../../ in locale code (should fail) |
| Input Validation | ✅ | Send invalid JSON and verify validation error |
| Content-Type | ✅ | Send POST with text/plain (should fail with 415) |
| Error Sanitization | ✅ | Trigger error and verify no stack trace in response |
| Logging | ✅ | Check logs for request IDs and structured format |
| Error Handler | ✅ | Access undefined route and verify 404 response |

---

## Change Log

### 2026-01-05

**Initial Release**
- Created comprehensive security documentation
- Documented all 12 security controls
- Added threat model and known limitations
- Added security testing guide

**Security Improvements Implemented**:
- ✅ Content-Type validation middleware
- ✅ Structured logging and audit trail (JSON format)
- ✅ Global error handler middleware
- ✅ Fixed health endpoint information disclosure
- ✅ Made server port configurable via PORT env var
- ✅ Path traversal protection (startup + runtime validation)
- ✅ Input validation with Zod schemas
- ✅ Session-based authentication
- ✅ Rate limiting (3-tier system)
- ✅ Request timeouts (server + client)
- ✅ Error sanitization
- ✅ CORS restriction to localhost

**Resolution Status**: All CRITICAL, HIGH, MEDIUM, and LOW severity issues from 2026-01-05 audit have been resolved.

---

## References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Express Security Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html
- **Node.js Security Checklist**: https://blog.risingstack.com/node-js-security-checklist/
- **OWASP Input Validation Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **OWASP Error Handling Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html

---

## License

This document is part of the XIV Dye Tools Maintainer project and is subject to the same license as the project.

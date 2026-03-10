# Bitespeed Identity Reconciliation Task

This is a production-ready Node.js & Express REST API for identity reconciliation. It links contacts across multiple transactions using email and phone number, consolidating them into "primary" and "secondary" contacts to create a unified customer identity.

## Project Overview

The core purpose of this service is to identify whether multiple orders or transactions belong to the same customer, even if they use different emails or phone numbers. 

### Features
- Links contacts based on shared `email` or `phoneNumber`.
- Ensures the oldest contact is designated as `primary`.
- Creates new secondary contacts when new information is introduced.
- Downgrades newer primary contacts if they are linked to older primary contacts.

## Database Schema (Prisma)

```prisma
model Contact {
  id             Int             @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?
  linkPrecedence LinkPrecedence  @default(primary)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?

  // Relations
  primaryContact    Contact?  @relation("ContactToContact", fields: [linkedId], references: [id])
  secondaryContacts Contact[] @relation("ContactToContact")
}
```

**Hosted Endpoint URL:**
[https://bitspeed-mmw0.onrender.com/identify]

## API Usage

### `POST /identify`

**Request Body:**
```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```
*Note: At least one of `email` or `phoneNumber` must be provided.*

**Response (Success 200 OK):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Setup & Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Setup Environment Variables:**
   Create a `.env` file in the root based on your PostgreSQL database:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/bitespeed"
   PORT=3000
   ```
3. **Run Prisma Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```
4. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Example `curl` Requests

**New Contact Creation:**
```bash
curl -X POST http://localhost:3000/identify \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com", "phoneNumber":"1234567890"}'
```

**Linking an existing contact with new info:**
```bash
curl -X POST http://localhost:3000/identify \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com", "phoneNumber":"0987654321"}'
```

## Deployment Instructions (Render)

This application is configured for deployment on Render.

1. Connect your GitHub repository to Render as a **Web Service**.
2. **Environment Environment:** `Node`
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npx prisma db push && npm start`
5. **Environment Variables:**
   - Add `DATABASE_URL` pointing to your Render PostgreSQL instance.
   - Add `PORT` (e.g., `10000`).



A `/health` endpoint is available at `GET /health` to verify deployment status.

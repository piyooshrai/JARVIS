# JARVIS

**Just-in-time Autonomic Response & Virtualization Infrastructure System**

A full-stack dashboard for managing multi-cloud infrastructure and Microsoft 365 users.

## Features

- **User Management** (Priority): Complete CRUD operations for Microsoft 365 users
  - Create users with domain selection
  - List and filter users by domain
  - View user activity and license status
  - AI-powered inactive user analysis
  - Cost tracking and optimization

- **Server Management** (Coming Soon): Multi-cloud server provisioning
  - DigitalOcean, AWS, GoDaddy integration
  - Unified dashboard for all providers

- **AI Assistant**: Claude-powered recommendations
  - User cleanup suggestions
  - Cost optimization insights
  - Infrastructure recommendations

## Tech Stack

### Backend
- **FastAPI** (Python 3.11+)
- **SQLite** for audit logs and caching
- **Microsoft Graph API** for O365 management
- **Anthropic Claude API** for AI recommendations

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Microsoft 365 account with admin privileges
- Microsoft Entra ID (Azure AD) app registration

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd JARVIS
```

### 2. Microsoft Entra ID App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** > **App registrations**
3. Click **New registration**
4. Name: `JARVIS`
5. Supported account types: **Accounts in this organizational directory only**
6. Click **Register**
7. Note the **Application (client) ID** and **Directory (tenant) ID**
8. Go to **Certificates & secrets** > **New client secret**
9. Add description, set expiration, and note the **secret value**
10. Go to **API permissions**:
    - Add **Microsoft Graph** > **Application permissions**:
      - `User.ReadWrite.All`
      - `Domain.Read.All`
      - `Directory.Read.All`
    - Click **Grant admin consent**

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example ../.env

# Edit .env and add your credentials
# Required for user management:
# - MICROSOFT_TENANT_ID
# - MICROSOFT_CLIENT_ID
# - MICROSOFT_CLIENT_SECRET
# - ANTHROPIC_API_KEY (optional, for AI features)
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### 5. Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Creating a New User

1. Click **Users** tab
2. Click **+ New User**
3. Fill in the form:
   - Full Name
   - Username and domain
   - Department (optional)
   - Manager email (optional)
   - License type
4. Click **Create User**

The user will be created in Microsoft 365 with a temporary password (they'll be required to change it on first login).

### Filtering Users

Use the domain dropdown to filter users by their email domain. This is useful for organizations with multiple domains.

### AI-Powered Cleanup

Click **Cleanup Inactive Users** to have Claude analyze your user base and suggest users to disable or remove based on:
- Users who have never signed in
- Users inactive for 90+ days
- Disabled users with licenses still assigned

## API Endpoints

### User Management
- `GET /api/domains` - Fetch verified domains
- `GET /api/users?domain=optional` - List users
- `POST /api/users` - Create new user
- `POST /api/users/{id}/disable` - Disable user
- `DELETE /api/users/{id}` - Delete user

### AI
- `POST /api/analyze-users` - Analyze users for cleanup
- `POST /api/ask` - Ask JARVIS a question

### Health
- `GET /health` - Service health check

## Security Notes

- Never commit `.env` file or credentials
- Use least-privilege access for Microsoft Graph permissions
- Rotate client secrets regularly
- Review audit logs in SQLite database
- All destructive actions are logged

## Cost Estimates

License costs (per user/month):
- **Business Basic**: $6.00
- **Business Standard**: $12.50

The dashboard automatically calculates total monthly costs based on active licensed users.

## Roadmap

- [x] Microsoft 365 user management
- [x] User creation with domain selection
- [x] AI-powered user analysis
- [ ] DigitalOcean server integration
- [ ] AWS EC2 integration
- [ ] GoDaddy integration
- [ ] Advanced license management
- [ ] Bulk user operations
- [ ] Export/import functionality
- [ ] Email notifications
- [ ] Role-based access control

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│   React     │────────▶│   FastAPI   │────────▶│  Microsoft Graph │
│  Frontend   │         │   Backend   │         │   (O365 Users)   │
└─────────────┘         └─────────────┘         └──────────────────┘
                              │
                              ├──────────────────▶ SQLite (Audit Logs)
                              │
                              └──────────────────▶ Claude API (AI)
```

## Troubleshooting

### "Failed to acquire token" error
- Verify your Microsoft credentials in `.env`
- Check that app permissions are granted
- Ensure admin consent is provided

### CORS errors
- Backend is running on port 8000
- Frontend is running on port 3000
- CORS is configured in `backend/main.py`

### No users showing up
- Check Microsoft Graph API permissions
- Verify you have users in your Microsoft 365 tenant
- Check browser console for errors

## License

Proprietary - Internal use only

## Support

For issues or questions, contact Piyoosh Rai.

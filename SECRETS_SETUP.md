# Secrets Setup Guide

## ⚠️ SECURITY NOTICE
The `appsettings.Production.json` file should **never be committed to git** as it contains sensitive information like API keys, database passwords, and access tokens.

## Setup Instructions

### For Development
1. Copy the template file: `appsettings.Production.example.json`
2. Rename it to: `appsettings.Production.json` (in your local project, not in git)
3. Fill in your actual secrets

### Production Deployment
Use **environment variables** or secure vaults instead:

#### Option 1: Environment Variables (.NET Configuration)
```bash
export ConnectionStrings__DefaultConnection="your_connection_string"
export Jwt__SecretKey="your_jwt_secret"
export OtpSettings__TwilioAccountSid="your_account_sid"
# ... etc for all secrets
```

#### Option 2: Azure Key Vault (Recommended for production)
```csharp
// In Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

#### Option 3: Docker Secrets / Docker Environment
Pass secrets via environment variables when running the container:
```bash
docker run -e "ConnectionStrings__DefaultConnection=..." -e "Jwt__SecretKey=..." myapp
```

## Files in git
- ✅ `appsettings.json` - Development defaults (public, no secrets)
- ✅ `appsettings.Development.json` - Dev-specific (public, no secrets)  
- ✅ `appsettings.Production.example.json` - Template showing required keys
- ❌ `appsettings.Production.json` - **NEVER commit** (local only, ignored by .gitignore)

## .gitignore Configuration
The following patterns are already configured to prevent accidental commits:
```
appsettings.json
appsettings.*.json
```

## ⚠️ Critical: Secrets Already Exposed
**The appsettings.Production.json file was previously committed to git. All secrets in the git history are now compromised and visible to anyone with repository access:**

### Immediate Actions Required:
1. **Rotate all exposed credentials immediately:**
   - Database password
   - JWT secret key
   - Razorpay API keys
   - Twilio credentials
   - Gmail/Email passwords (use app-specific passwords instead)
   - MongoDB connection credentials
   - Brevo API key
   - Resend API key
   - AI Agent API key

2. **Remove secrets from git history** (if this is critical):
   - Use `git-filter-repo` or `BFG Repo-Cleaner` to purge old commits
   - Force push changes: `git push --force-with-lease`
   - Inform all team members to re-clone the repository

3. **Use environment variables or a secrets manager** going forward for all deployments.

## Verification
To verify the file is now ignored:
```bash
git status  # Should NOT show appsettings.Production.json
git ls-files | grep appsettings  # Should NOT list the production file
```

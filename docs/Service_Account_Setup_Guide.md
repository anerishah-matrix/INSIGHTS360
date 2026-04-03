# Service Account Setup & Credentials Guide

This document provides a step-by-step guide for creating a Google Cloud Service Account and generating the `credentials.json` file required for the Insights360 backend to access Google Drive.

## 1. Google Cloud Project Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one (e.g., `bi-dashboard-drive`).
3. **Enable the Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for "Google Drive API".
   - Click it and click **Enable**.

## 2. Create the Service Account
1. Go to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** and select **Service Account**.
3. **Service account details**:
   - Name: `bi-dashboard-reader` (or similar).
   - ID: This will auto-generate based on the name.
   - Description: "Used by Insights360 Dashboard to read sales data from shared folders."
4. Click **CREATE AND CONTINUE**.
5. **Grant permissions** (Optional but recommended):
   - You can leave this blank as the code uses specific Scopes, but granting the `Viewer` role at the project level can help avoid permission issues.
6. Click **DONE**.

## 3. Generate the Keys (`credentials.json`)
1. In the **Service Accounts** list, click on the email of the account you just created.
2. Go to the **Keys** tab.
3. Click **ADD KEY > Create new key**.
4. Select **JSON** and click **CREATE**.
5. The file will download automatically. **Rename it to `credentials.json`**.

## 4. Required File Structure (`credentials.json`)
Since `credentials.json` is not stored in Git, you must create it manually in the `/server` folder. Below is the required structure. 

> [!IMPORTANT]
> The `private_key` and `private_key_id` must be obtained from the Google Cloud Console (Step 3 above). DO NOT share your actual private key.

```json
{
  "type": "service_account",
  "project_id": "bi-dashboard-drive",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "bi-dashboard-reader@bi-dashboard-drive.iam.gserviceaccount.com",
  "client_id": "115151149134621210182",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/bi-dashboard-reader%40bi-dashboard-drive.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

## 5. Required Environment Variables (`.env`)
The `.env` file in the `/server` folder stores configurations and email credentials. Since it is ignored by Git, you must create it. Use `server/.env.example` as a template.

```env
# Server Configuration
PORT=5001

# Email Configuration (for Nodemailer)
# Use an 'App Password' if your email provider requires it (e.g., Gmail)
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
```

## 6. Integrate with the Project
1. **Backend**:
   - Place your generated `credentials.json` and `.env` files inside the `/server` directory.
   - Ensure they are **ignored by Git** (check `.gitignore`).
2. **Frontend Support**:
   - If the service account email changed, update the hardcoded email in `bi-dashboard/src/App.jsx` (near the "No Data Found" message).
3. **Documentation**:
   - Update `Insights360_User_Guide.md` with the new service account email address so users know who to share their folders with.

## 6. Security & Maintenance
- **Key Rotation**: It is recommended to create a new key and delete the old one every 90 days.
- **Never Commit Keys**: If `credentials.json` is ever committed to Git, delete the key immediately in the Cloud Console and generate a new one.

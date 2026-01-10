# Quick Setup Guide

## Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Step 2: Setup MongoDB

Make sure MongoDB is installed and running:
- **Windows**: Download from mongodb.com and start MongoDB service
- **macOS**: `brew install mongodb-community` then `brew services start mongodb-community`
- **Linux**: `sudo systemctl start mongod`

Or use MongoDB Atlas (cloud) and get the connection string.

## Step 3: Configure Gmail IMAP Access

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Name it "Resume Extractor"
6. Copy the 16-character password

## Step 4: Create Backend .env File

In the `backend` folder, create a `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resume_extractor
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=ac@gmail.com
IMAP_PASSWORD=paste_your_16_character_app_password_here
IMAP_TLS=true
FRONTEND_URL=http://localhost:3000
```

**Important**: Replace `ac@gmail.com` with your actual Gmail address and paste your App Password.

## Step 5: Start the Application

### Terminal 1 - Backend
```bash
cd backend
npm start
```

You should see:
- `MongoDB Connected`
- `Server running on port 5000`
- `Connected to IMAP server`

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

The browser will automatically open to `http://localhost:3000`

## Step 6: Test the System

1. Send a test email to `ac@gmail.com` (or your configured email)
2. Attach a PDF resume to the email
3. The system will automatically:
   - Detect the email (within 30 seconds)
   - Download the PDF
   - Extract resume data
   - Save to MongoDB
   - Show notification on frontend

## Troubleshooting

### IMAP Connection Error
- Double-check your App Password (16 characters, no spaces)
- Verify 2-Step Verification is enabled
- Check that IMAP is enabled in Gmail settings

### MongoDB Connection Error
- Verify MongoDB is running: `mongod --version`
- Check connection string in `.env`
- For MongoDB Atlas, ensure your IP is whitelisted

### No Emails Detected
- Check that emails have PDF attachments
- Verify emails are unread (the system only processes UNSEEN emails)
- Check backend console for error messages

### Frontend Not Connecting
- Verify backend is running on port 5000
- Check browser console for connection errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL

## Development Mode

For auto-reload during development:

```bash
# Backend
cd backend
npm run dev

# Frontend (auto-reloads by default)
cd frontend
npm start
```

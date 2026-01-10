# Resume Extractor - MERN Stack Application

A real-time email resume extraction system that monitors an email inbox, automatically downloads PDF attachments, extracts resume data (name, email, contact number, DOB), and saves it to MongoDB with real-time notifications.

## Features

- 📧 **IMAP Email Monitoring** - Continuously monitors email inbox for new messages
- 📄 **PDF Attachment Processing** - Automatically downloads and processes PDF resumes
- 🤖 **AI-Powered Data Extraction** - Extracts name, email, contact number, and date of birth from resumes
- 💾 **MongoDB Storage** - Saves extracted data with metadata
- 🔔 **Real-time Notifications** - Socket.io powered real-time updates to frontend
- 🎨 **Modern UI** - Beautiful React frontend with responsive design

## Project Structure

```
.
├── backend/
│   ├── models/
│   │   └── Resume.js          # MongoDB schema
│   ├── routes/
│   │   └── resumeRoutes.js    # API routes
│   ├── services/
│   │   ├── emailService.js    # IMAP email monitoring
│   │   └── pdfParser.js       # PDF data extraction
│   ├── uploads/               # PDF storage directory
│   ├── server.js              # Express server with Socket.io
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── App.css            # Styles
│   │   └── index.js           # React entry point
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gmail account with App Password enabled (for IMAP access)

## Gmail Setup (IMAP Access)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Resume Extractor" as the name
   - Copy the generated 16-character password
3. Use this App Password in your `.env` file

## Installation

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resume_extractor
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=ac@gmail.com
IMAP_PASSWORD=your_16_character_app_password
IMAP_TLS=true
FRONTEND_URL=http://localhost:3000
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```env
REACT_APP_API_URL=http://localhost:5000
```

## Running the Application

### Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### Start Backend Server

```bash
cd backend
npm start
# or for development with auto-reload
npm run dev
```

The backend server will start on `http://localhost:5000`

### Start Frontend

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## How It Works

1. **Email Monitoring**: The backend connects to Gmail via IMAP and checks for new emails every 30 seconds
2. **Attachment Detection**: When a new email with PDF attachment is detected, it's automatically downloaded
3. **PDF Processing**: The PDF is parsed to extract text content
4. **Data Extraction**: Using regex patterns, the system extracts:
   - Name (from various patterns like "Name:", first line, etc.)
   - Email address
   - Contact number (phone/mobile)
   - Date of Birth
5. **Database Storage**: Extracted data is saved to MongoDB
6. **Real-time Updates**: Socket.io emits notifications to all connected clients
7. **Frontend Display**: The React app displays all extracted resumes in real-time

## API Endpoints

- `GET /api/resumes` - Get all resumes
- `GET /api/resumes/:id` - Get a specific resume
- `DELETE /api/resumes/:id` - Delete a resume
- `GET /api/resumes/stats/count` - Get total resume count
- `GET /api/health` - Health check endpoint

## Real-time Events

- `newResume` - Emitted when a new resume is extracted and saved

## Technologies Used

### Backend
- Node.js & Express
- MongoDB & Mongoose
- imap-simple (IMAP email access)
- mailparser (Email parsing)
- pdf-parse (PDF text extraction)
- Socket.io (Real-time communication)

### Frontend
- React
- Socket.io Client
- Axios (HTTP requests)
- CSS3 (Modern styling)

## Notes

- The system processes emails with PDF attachments only
- Email UIDs are tracked to avoid reprocessing the same email
- PDFs are stored in the `backend/uploads/` directory
- The system automatically reconnects if IMAP connection is lost
- Check interval can be adjusted in `emailService.js` (currently 30 seconds)

## Troubleshooting

**IMAP Connection Failed:**
- Verify your Gmail App Password is correct
- Check that IMAP is enabled in Gmail settings
- Ensure your network allows IMAP connections (port 993)

**MongoDB Connection Error:**
- Verify MongoDB is running
- Check the connection string in `.env`
- For MongoDB Atlas, ensure IP whitelist includes your IP

**PDF Extraction Issues:**
- The extraction relies on text-based PDFs (scanned PDFs may not work)
- Resume format affects extraction accuracy
- Check `uploads/` directory permissions

## License

MIT

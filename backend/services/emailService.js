const imap = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
require('dotenv').config();

const Email = require('../models/Resume'); // File is Resume.js but exports Email model
const { extractResumeData } = require('./pdfParser');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

const imapConfig = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT) || 993,
    tls: process.env.IMAP_TLS === 'true',
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 3000
  }
};

let isMonitoring = false;
let connection = null;

// Store processed email UIDs to avoid reprocessing
const processedEmails = new Set();

async function processEmail(connection, io) {
  try {
    // Get today's date for filtering
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Format date for display
    const formatDate = (date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
    
    const todayStr = formatDate(todayStart);
    
    const fetchOptions = {
      bodies: '',
      struct: true
    };
    
    console.log(`📧 Searching for emails from today: ${todayStr}...`);
    console.log(`Processing ALL emails from today (read/unread doesn't matter)`);
    
    // Get all emails and filter by today's date
    let messages = [];
    
    try {
      console.log('Step 1: Fetching recent emails...');
      const allMessages = await connection.search(['ALL'], fetchOptions);
      console.log(`✓ Found ${allMessages.length} total email(s) in inbox`);
      
      // Limit to most recent 300 emails for performance
      if (allMessages.length > 300) {
        messages = allMessages.slice(0, 300);
        console.log(`✓ Limited to ${messages.length} most recent emails for processing`);
      } else {
        messages = allMessages;
      }
    } catch (allError) {
      console.error(`Error getting emails: ${allError.message}`);
      console.error(allError.stack);
      return;
    }
    
    // Filter to only include emails from today
    if (messages.length > 0) {
      const originalCount = messages.length;
      console.log(`Step 2: Filtering ${originalCount} emails to find today's emails...`);
      
      messages = messages.filter(msg => {
        try {
          let emailDate = null;
          
          if (msg.attributes.date) {
            emailDate = new Date(msg.attributes.date);
          } else if (msg.attributes.envelope && msg.attributes.envelope.date) {
            emailDate = new Date(msg.attributes.envelope.date);
          }
          
          if (!emailDate || isNaN(emailDate.getTime())) {
            console.log(`  ⚠️  Email UID ${msg.attributes.uid} has no valid date, including it anyway`);
            return true;
          }
          
          // Compare dates only (not times) - check if it's the same calendar day
          const emailDateOnly = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate());
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          const isToday = emailDateOnly.getTime() === todayDateOnly.getTime();
          
          if (isToday) {
            console.log(`  ✓ Email UID ${msg.attributes.uid} is from today: ${emailDate.toLocaleString()}`);
          } else {
            console.log(`  ❌ Email UID ${msg.attributes.uid} is from ${emailDate.toLocaleDateString()}, skipping`);
          }
          return isToday;
        } catch (err) {
          console.log(`  ⚠️  Error checking date for email UID ${msg.attributes.uid}:`, err.message);
          return true;
        }
      });
      console.log(`✓ Filtered ${originalCount} total emails to ${messages.length} from today`);
    }
    
    if (messages.length === 0) {
      console.log(`No emails found from today (${todayStr}).`);
      return;
    }

    console.log(`✓ Found ${messages.length} email(s) from today`);

    for (const message of messages) {
      const uid = message.attributes.uid;
      
      // Skip if already processed
      if (processedEmails.has(uid)) {
        console.log(`Email UID ${uid} already processed, skipping...`);
        continue;
      }

      try {
        console.log(`\n📨 Processing email UID ${uid}...`);
        
        // Fetch the full raw email message
        let emailBody = null;
        
        // Get the full message body from the parts
        if (message.parts && message.parts.length > 0) {
          const fullPart = message.parts.find(part => part.which === '' || part.which === undefined);
          if (fullPart && fullPart.body) {
            emailBody = fullPart.body;
            console.log(`✓ Got email body from message.parts, size: ${emailBody.length} bytes`);
          } else if (message.parts[0] && message.parts[0].body) {
            emailBody = message.parts[0].body;
            console.log(`✓ Got email body from first part, size: ${emailBody.length} bytes`);
          }
        }
        
        // If we don't have the body yet, fetch it using getPartData
        if (!emailBody) {
          try {
            const parts = imap.getParts(message.attributes.struct);
            if (parts && parts.length > 0) {
              let rootPart = parts.find(part => !part.partID || part.partID === '1');
              if (!rootPart) {
                rootPart = parts[0];
              }
              
              if (rootPart) {
                console.log(`Fetching full email using partID: ${rootPart.partID || 'root'}`);
                emailBody = await connection.getPartData(message, rootPart);
                console.log(`✓ Fetched email body using getPartData, size: ${emailBody ? emailBody.length : 0} bytes`);
              }
            }
          } catch (err) {
            console.error(`Error fetching part data:`, err.message);
          }
        }
        
        // Last resort: Re-fetch the message completely
        if (!emailBody) {
          try {
            console.log(`Re-fetching full message for UID ${uid}...`);
            const refetchOptions = {
              bodies: '',
              struct: true
            };
            const refetched = await connection.search([['UID', uid]], refetchOptions);
            if (refetched && refetched.length > 0 && refetched[0].parts) {
              const refetchMsg = refetched[0];
              const refetchFullPart = refetchMsg.parts.find(p => !p.which || p.which === '') || refetchMsg.parts[0];
              if (refetchFullPart && refetchFullPart.body) {
                emailBody = refetchFullPart.body;
                console.log(`✓ Re-fetched email body, size: ${emailBody.length} bytes`);
              }
            }
          } catch (err) {
            console.error(`Error re-fetching message:`, err.message);
          }
        }
        
        if (!emailBody) {
          console.error(`❌ Could not fetch email body for UID ${uid}`);
          processedEmails.add(uid);
          continue;
        }

        // Convert to Buffer if needed
        if (typeof emailBody === 'string') {
          emailBody = Buffer.from(emailBody);
        } else if (emailBody instanceof Uint8Array) {
          emailBody = Buffer.from(emailBody);
        } else if (!Buffer.isBuffer(emailBody)) {
          emailBody = Buffer.from(emailBody);
        }
        
        console.log(`✓ Email body ready, size: ${emailBody.length} bytes`);

        // Parse the email using mailparser
        await processEmailContent(emailBody, uid, io);
        
      } catch (error) {
        console.error(`❌ Error processing email UID ${uid}:`, error.message);
        console.error(error.stack);
      }
    }
  } catch (error) {
    console.error('Error processing emails:', error.message);
    console.error(error.stack);
  }
}

async function processEmailContent(emailData, uid, io) {
  try {
    console.log(`\n📨 Parsing email UID ${uid}...`);
    
    // Parse email using mailparser
    const parsed = await simpleParser(emailData);
    
    console.log(`✓ Email parsed successfully`);
    console.log(`  From: ${parsed.from ? parsed.from.text : 'Unknown'}`);
    console.log(`  Subject: ${parsed.subject || 'No Subject'}`);
    console.log(`  Date: ${parsed.date || 'Unknown'}`);
    
    // Extract email body text
    let emailBodyText = '';
    
    // Try to get plain text first, then HTML
    if (parsed.text) {
      emailBodyText = parsed.text;
    } else if (parsed.textAsHtml) {
      // Convert HTML to plain text
      emailBodyText = parsed.textAsHtml.replace(/<[^>]*>/g, '').trim();
    } else if (parsed.html) {
      // Convert HTML to plain text
      emailBodyText = parsed.html.replace(/<[^>]*>/g, '').trim();
    } else if (parsed.textAsPlainText) {
      emailBodyText = parsed.textAsPlainText;
    }
    
    // Clean up the text (remove excessive whitespace)
    emailBodyText = emailBodyText.replace(/\n{3,}/g, '\n\n').trim();
    
    console.log(`  Body length: ${emailBodyText.length} characters`);
    
    if (!emailBodyText) {
      console.log(`⚠️  No email body text found for UID ${uid}`);
      emailBodyText = '(No content)';
    }
    
    // Get sender information
    const senderEmail = parsed.from && parsed.from.value && parsed.from.value[0] ? 
      parsed.from.value[0].address : 
      'unknown@example.com';
    
    const senderName = parsed.from && parsed.from.value && parsed.from.value[0] ? 
      (parsed.from.value[0].name || senderEmail) : 
      senderEmail;
    
    // Check if email has PDF attachments and process them
    let attachmentData = null;
    let hasAttachment = false;
    
    if (parsed.attachments && parsed.attachments.length > 0) {
      console.log(`  Found ${parsed.attachments.length} attachment(s)`);
      
      // Look for PDF attachments
      for (const attachment of parsed.attachments) {
        const filename = attachment.filename || attachment.name || '';
        const contentType = attachment.contentType || '';
        const isPdf = contentType === 'application/pdf' || 
                      filename.toLowerCase().endsWith('.pdf');
        
        console.log(`  Checking attachment: ${filename}, Type: ${contentType}, IsPDF: ${isPdf}`);
        
        if (isPdf) {
          console.log(`  📎 Processing PDF attachment: ${filename}`);
          hasAttachment = true;
          
          try {
            // Ensure uploads directory exists
            await fs.ensureDir(uploadsDir);
            console.log(`  ✓ Uploads directory verified: ${uploadsDir}`);
            
            // Create unique filename with timestamp
            const timestamp = Date.now();
            const originalFilename = filename || 'resume.pdf';
            const sanitizedFilename = originalFilename
              .replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/\s+/g, '_');
            
            const pdfFilename = `${timestamp}_${sanitizedFilename}`;
            const pdfPath = path.join(uploadsDir, pdfFilename);
            
            console.log(`  Saving PDF to: ${pdfPath}`);
            
            // Handle attachment content - convert to Buffer
            let pdfContent;
            if (Buffer.isBuffer(attachment.content)) {
              pdfContent = attachment.content;
              console.log(`  PDF content is Buffer, size: ${pdfContent.length} bytes`);
            } else if (attachment.content instanceof Uint8Array) {
              pdfContent = Buffer.from(attachment.content);
              console.log(`  PDF content is Uint8Array, converted to Buffer, size: ${pdfContent.length} bytes`);
            } else if (typeof attachment.content === 'string') {
              try {
                // Try base64 first
                pdfContent = Buffer.from(attachment.content, 'base64');
                console.log(`  PDF content is string (base64), converted to Buffer, size: ${pdfContent.length} bytes`);
              } catch {
                // If base64 fails, try as plain string
                pdfContent = Buffer.from(attachment.content, 'binary');
                console.log(`  PDF content is string (binary), converted to Buffer, size: ${pdfContent.length} bytes`);
              }
            } else {
              pdfContent = Buffer.from(attachment.content);
              console.log(`  PDF content converted to Buffer, size: ${pdfContent.length} bytes`);
            }
            
            if (!pdfContent || pdfContent.length === 0) {
              throw new Error('PDF content is empty');
            }
            
            // Save PDF file to uploads folder
            await fs.writeFile(pdfPath, pdfContent);
            console.log(`  ✅ PDF file saved successfully to: ${pdfPath}`);
            
            // Verify file was saved
            const fileStats = await fs.stat(pdfPath);
            console.log(`  ✓ File verified on disk, size: ${fileStats.size} bytes`);
            
            // Read the saved PDF and parse it
            console.log(`  Parsing PDF to extract text...`);
            const pdfBuffer = await fs.readFile(pdfPath);
            let pdfData = null;
            let extractedText = '';
            
            try {
              // First, try pdf-parse (works for text-based PDFs)
              pdfData = await pdfParse(pdfBuffer);
              extractedText = pdfData.text || '';
              console.log(`  ✅ PDF parsed with pdf-parse, extracted ${extractedText.length} characters`);
            } catch (parseError) {
              console.log(`  ⚠️  pdf-parse failed: ${parseError.message}`);
              console.log(`  Will try OCR for scanned PDF...`);
            }
            
            // If pdf-parse didn't extract text or extracted very little, try OCR
            if (!extractedText || extractedText.trim().length < 50) {
              console.log(`  🔍 PDF appears to be scanned or image-based, attempting OCR...`);
              console.log(`  ⚠️  Note: OCR works best when PDF pages are converted to images first.`);
              console.log(`  📸 Running OCR on PDF directly (this may take a moment)...`);
              
              try {
                // Try to use Tesseract.js for OCR
                // Note: Tesseract.js works best with images. For PDFs, consider converting pages to images first
                // using pdf-img-convert or similar (requires native dependencies on Windows)
                const { data: { text: ocrText } } = await Tesseract.recognize(pdfBuffer, 'eng', {
                  logger: m => {
                    if (m.status === 'recognizing text') {
                      console.log(`  OCR progress: ${Math.round(m.progress * 100)}%`);
                    }
                  }
                });
                
                if (ocrText && ocrText.trim().length > 0) {
                  extractedText = ocrText;
                  console.log(`  ✅ OCR completed successfully, extracted ${extractedText.length} characters`);
                  
                  // Create a mock pdfData object for consistency
                  pdfData = { text: extractedText };
                } else {
                  console.log(`  ⚠️  OCR completed but no text was extracted`);
                  console.log(`  💡 Tip: For scanned PDFs, consider converting PDF pages to images first for better OCR accuracy`);
                }
              } catch (ocrError) {
                console.error(`  ❌ OCR failed: ${ocrError.message}`);
                console.error(`  💡 Tip: For better OCR support, install pdf-img-convert to convert PDF pages to images first`);
                console.error(`  💡 Alternative: Use a cloud OCR service for production-grade scanned PDF processing`);
                // Continue with whatever text we have (even if empty)
              }
            }
            
            if (!extractedText || extractedText.trim().length === 0) {
              console.log(`  ⚠️  Could not extract text from PDF (neither pdf-parse nor OCR worked)`);
              extractedText = '';
            }
            
            // Extract structured data from PDF (name, email, contact, DOB)
            console.log(`  Extracting structured data from PDF...`);
            if (extractedText.length > 0) {
              console.log(`  PDF text preview (first 500 chars): ${extractedText.substring(0, 500)}`);
            }
            
            const extractedData = extractResumeData(extractedText);
            
            console.log(`  ✅ Extracted data from PDF:`);
            console.log(`     - Name: "${extractedData.name || 'Not found'}"`);
            console.log(`     - Email: "${extractedData.email || 'Not found'}"`);
            console.log(`     - Contact: "${extractedData.contactNumber || 'Not found'}"`);
            console.log(`     - DOB: "${extractedData.dateOfBirth || 'Not found'}"`);
            
            // Prepare attachment data for MongoDB - only include if we found data
            attachmentData = {
              name: extractedData.name || '',
              email: extractedData.email || '',
              contactNumber: extractedData.contactNumber || '',
              dateOfBirth: extractedData.dateOfBirth || '',
              pdfPath: pdfPath, // Store the full path to the saved PDF
              pdfFilename: pdfFilename, // Store just the filename
              rawText: extractedText.substring(0, 5000) // Store first 5000 chars for reference
            };
            
            // Log what will be saved
            console.log(`  📦 Attachment data to save:`, JSON.stringify(attachmentData, null, 2));
            
            console.log(`  ✅ PDF attachment processed successfully`);
            
            // Found PDF, process only the first one
            break;
          } catch (error) {
            console.error(`  ❌ Error processing PDF attachment:`, error.message);
            console.error(`  Stack:`, error.stack);
            // Continue processing email even if PDF fails
          }
        }
      }
      
      if (!hasAttachment) {
        console.log(`  No PDF attachments found in ${parsed.attachments.length} attachment(s)`);
      }
    } else {
      console.log(`  No attachments found in email`);
    }
    
    // Create unique email ID
    const emailId = `uid_${uid}`;
    
    // Check if email already exists in database
    const existingEmail = await Email.findOne({ emailId: emailId });
    if (existingEmail) {
      console.log(`⚠️  Email UID ${uid} already exists in database`);
      
      // If it exists but doesn't have attachment data, update it
      if (hasAttachment && attachmentData && (!existingEmail.attachmentData || !existingEmail.attachmentData.name)) {
        console.log(`  Updating existing email with PDF attachment data...`);
        existingEmail.hasAttachment = true;
        existingEmail.attachmentData = attachmentData;
        await existingEmail.save();
        console.log(`✅ Updated email with PDF data: Name=${attachmentData.name}, Email=${attachmentData.email}`);
        
        // Emit notification
        if (io) {
          io.emit('newEmail', {
            message: 'Email updated with PDF attachment data!',
            email: existingEmail
          });
        }
      }
      
      processedEmails.add(uid);
      return;
    }
    
    // Save to MongoDB
    console.log(`  Saving email to MongoDB...`);
    console.log(`  Email data:`, {
      from: senderEmail,
      subject: parsed.subject,
      hasAttachment: hasAttachment,
      attachmentData: attachmentData
    });
    
    const email = new Email({
      from: senderEmail,
      fromName: senderName,
      subject: parsed.subject || 'No Subject',
      body: emailBodyText,
      receivedAt: parsed.date || new Date(),
      emailId: emailId,
      hasAttachment: hasAttachment,
      attachmentData: attachmentData || undefined  // Only include if attachmentData exists
    });
    
    const savedEmail = await email.save();
    console.log(`✅ Email saved successfully: "${savedEmail.subject}" (ID: ${savedEmail._id})`);
    
    if (hasAttachment && attachmentData) {
      console.log(`✅ PDF attachment data saved to MongoDB:`);
      console.log(`     - Name: ${attachmentData.name || 'Not extracted'}`);
      console.log(`     - Email: ${attachmentData.email || 'Not extracted'}`);
      console.log(`     - Contact: ${attachmentData.contactNumber || 'Not extracted'}`);
      console.log(`     - DOB: ${attachmentData.dateOfBirth || 'Not extracted'}`);
      console.log(`     - PDF Path: ${attachmentData.pdfPath}`);
    } else {
      console.log(`ℹ️  No PDF attachment found in email`);
    }
    
    // Mark email as processed
    processedEmails.add(uid);
    
    // Emit real-time notification
    if (io) {
      io.emit('newEmail', {
        message: hasAttachment ? 'New email with PDF attachment received!' : 'New email received!',
        email: savedEmail
      });
      console.log(`✓ Real-time notification sent to frontend`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing email content:`, error.message);
    console.error(error.stack);
    processedEmails.add(uid);
  }
}

async function startMonitoring(io) {
  if (isMonitoring) {
    console.log('Email monitoring already running');
    return;
  }

  try {
    console.log('Connecting to IMAP server...');
    connection = await imap.connect(imapConfig);
    
    await connection.openBox('INBOX');
    console.log('✓ Connected to IMAP server');
    
    isMonitoring = true;

    // Check for new emails every 10 seconds
    const checkInterval = setInterval(async () => {
      try {
        await connection.openBox('INBOX');
        await processEmail(connection, io);
      } catch (error) {
        console.error('Error in email check interval:', error.message);
        try {
          connection.end();
          connection = await imap.connect(imapConfig);
          await connection.openBox('INBOX');
          console.log('Reconnected to IMAP server');
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError.message);
        }
      }
    }, 10000); // Check every 10 seconds

    // Listen for new emails in real-time
    connection.on('mail', async () => {
      console.log('📬 New email detected via IMAP event!');
      await processEmail(connection, io);
    });

    // Process existing emails on startup
    console.log('Checking for existing emails from today...');
    await processEmail(connection, io);
    
  } catch (error) {
    console.error('Failed to connect to IMAP server:', error.message);
    console.error('Please check your IMAP credentials in .env file');
    console.error(error.stack);
    isMonitoring = false;
  }
}

async function stopMonitoring() {
  if (connection) {
    await connection.end();
    connection = null;
  }
  isMonitoring = false;
  console.log('Email monitoring stopped');
}

module.exports = {
  startMonitoring,
  stopMonitoring
};

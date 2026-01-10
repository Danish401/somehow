/**
 * Extracts structured data from resume PDF text
 * Improved patterns based on common resume formats
 */
function extractResumeData(text) {
  const data = {
    name: '',
    email: '',
    contactNumber: '',
    dateOfBirth: ''
  };

  if (!text || text.length === 0) {
    console.log('⚠️  PDF text is empty');
    return data;
  }

  console.log(`📄 PDF text length: ${text.length} characters`);
  console.log(`📄 First 500 chars: ${text.substring(0, 500)}`);

  // Keep original text with newlines for better pattern matching
  const originalText = text;
  const lines = originalText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`📄 Total lines: ${lines.length}`);
  console.log(`📄 First 10 lines:`, lines.slice(0, 10));

  // ========== EXTRACT NAME ==========
  console.log('🔍 Extracting name...');
  
  // Strategy 1: Look for "Name:" or "Full Name:" patterns (case insensitive)
  const namePatterns1 = [
    /(?:^|\n)\s*name\s*[:]\s*([^\n\r]+)/i,
    /(?:^|\n)\s*full\s*name\s*[:]\s*([^\n\r]+)/i,
    /name\s*[:]\s*([A-Za-z\s]+)/i,
    /full\s*name\s*[:]\s*([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns1) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      data.name = match[1].trim();
      console.log(`✓ Name found (pattern 1): "${data.name}"`);
      break;
    }
  }

  // Strategy 2: Look for all-caps name at the start (common in resumes)
  // First check if first line is all caps (could be name even if single word)
  if (!data.name && lines.length > 0) {
    const firstLine = lines[0];
    // Check if first line is all uppercase letters (could be "DANISHALI" or "DANISH ALI")
    if (firstLine === firstLine.toUpperCase() && /^[A-Z]+$/.test(firstLine.replace(/\s/g, ''))) {
      // If it's a single word, try to split it intelligently (e.g., "DANISHALI" -> "DANISH ALI")
      if (firstLine.length > 5 && firstLine.length < 30) {
        // Try to detect if it's two names combined (common pattern)
        // Look for patterns like "DANISHALI" where we can split
        const splitPattern = /^([A-Z]{3,})([A-Z]{3,})$/;
        const splitMatch = firstLine.match(splitPattern);
        if (splitMatch) {
          data.name = `${splitMatch[1]} ${splitMatch[2]}`;
          console.log(`✓ Name found (all caps single word, split): "${data.name}"`);
        } else {
          data.name = firstLine;
          console.log(`✓ Name found (all caps first line): "${data.name}"`);
        }
      }
    }
  }

  // Strategy 2b: Look for all-caps name with spaces at the start
  if (!data.name) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Check if line is all uppercase and 2-4 words
      if (line === line.toUpperCase() && line.length > 5 && line.length < 50) {
        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && /^[A-Z\s]+$/.test(line)) {
          data.name = line;
          console.log(`✓ Name found (all caps with spaces, line ${i}): "${data.name}"`);
          break;
        }
      }
    }
  }

  // Strategy 3: Look for capitalized words at the start (2-4 words, all capitalized)
  if (!data.name) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const words = line.split(/\s+/);
      
      // Check if line has 2-4 words and all start with capital letters
      if (words.length >= 2 && words.length <= 4) {
        const allCapitalized = words.every(word => 
          word.length > 0 && /^[A-Z]/.test(word) && /^[A-Za-z]+$/.test(word)
        );
        if (allCapitalized && /^[A-Za-z\s]+$/.test(line)) {
          data.name = line;
          console.log(`✓ Name found (capitalized, line ${i}): "${data.name}"`);
          break;
        }
      }
    }
  }

  // Strategy 4: Look for common name patterns (First Last format)
  if (!data.name) {
    const namePattern = /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m;
    const match = originalText.match(namePattern);
    if (match && match[1]) {
      data.name = match[1].trim();
      console.log(`✓ Name found (pattern 4): "${data.name}"`);
    }
  }

  if (!data.name) {
    console.log('❌ Name not found');
  }

  // ========== EXTRACT EMAIL ==========
  console.log('🔍 Extracting email...');
  const emailPatterns = [
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    /email\s*[:]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /e-mail\s*[:]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /mail\s*[:]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ];
  
  for (const pattern of emailPatterns) {
    const matches = originalText.match(pattern);
    if (matches && matches.length > 0) {
      // Extract just the email address (remove "email:" prefix if present)
      for (const match of matches) {
        const emailMatch = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch && emailMatch[1]) {
          data.email = emailMatch[1].toLowerCase();
          console.log(`✓ Email found: "${data.email}"`);
          break;
        }
      }
      if (data.email) break;
    }
  }

  if (!data.email) {
    console.log('❌ Email not found');
  }

  // ========== EXTRACT CONTACT NUMBER ==========
  console.log('🔍 Extracting contact number...');
  
  // Look for phone patterns with labels first
  const phoneWithLabelPatterns = [
    /(?:phone|mobile|contact|tel|telephone|cell)\s*[:]?\s*([+\d\s\-()]+)/gi,
    /(?:phone|mobile|contact|tel|telephone|cell)\s*[:]?\s*(\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/gi
  ];
  
  for (const pattern of phoneWithLabelPatterns) {
    const matches = originalText.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        // Extract digits and + from the match
        const cleaned = match.replace(/[^\d+]/g, '');
        if (cleaned.length >= 10) {
          data.contactNumber = cleaned;
          console.log(`✓ Contact found (with label): "${data.contactNumber}"`);
          break;
        }
      }
      if (data.contactNumber) break;
    }
  }

  // If not found, look for standalone phone numbers
  if (!data.contactNumber) {
    const phonePatterns = [
      /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      /\b\d{10,15}\b/g
    ];
    
    for (const pattern of phonePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const cleaned = match.replace(/[^\d+]/g, '');
          if (cleaned.length >= 10 && cleaned.length <= 15) {
            data.contactNumber = cleaned;
            console.log(`✓ Contact found (standalone): "${data.contactNumber}"`);
            break;
          }
        }
        if (data.contactNumber) break;
      }
    }
  }

  if (!data.contactNumber) {
    console.log('❌ Contact number not found');
  }

  // ========== EXTRACT DATE OF BIRTH ==========
  console.log('🔍 Extracting date of birth...');
  const dobPatterns = [
    /(?:date\s*of\s*birth|dob|d\.o\.b\.|birth\s*date|born)\s*[:]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/gi,
    /(?:date\s*of\s*birth|dob|d\.o\.b\.|birth\s*date|born)\s*[:]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
    /(?:born|birth)\s*[:]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/gi
  ];
  
  for (const pattern of dobPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const dateStr = (match[1] || match[0]).trim();
      if (dateStr) {
        data.dateOfBirth = dateStr;
        console.log(`✓ DOB found: "${data.dateOfBirth}"`);
        break;
      }
    }
  }

  // If DOB not found, look for any date that looks like a birth date (between 1940-2005)
  if (!data.dateOfBirth) {
    const datePattern = /\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](19[4-9]\d|200[0-5])\b/g;
    const dateMatches = originalText.match(datePattern);
    if (dateMatches && dateMatches.length > 0) {
      data.dateOfBirth = dateMatches[0].trim();
      console.log(`✓ DOB found (fallback): "${data.dateOfBirth}"`);
    }
  }

  if (!data.dateOfBirth) {
    console.log('❌ DOB not found');
  }

  console.log(`\n📊 Final extracted data:`, JSON.stringify(data, null, 2));
  return data;
}

module.exports = {
  extractResumeData
};

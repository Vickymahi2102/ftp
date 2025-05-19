const express = require('express');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 8081;

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Add CORS headers - install cors package
const cors = require('cors');
app.use(cors({
  origin: '*', // In production, specify actual origins instead of wildcard
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', (req, res) => {
  res.send('Welcome to the Express FTP API!');
});

app.get('/api/image', async (req, res) => {
  const filename = req.query.filename;
  
  // Validate filename
  if (!filename) {
    return res.status(400).send('Filename is required');
  }
  
  // Prevent path traversal attacks
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid filename');
  }
  
  const client = new ftp.Client(30000); // Timeout after 30 seconds
  client.ftp.verbose = false; // Set to true for debugging
  
  try {
    await client.access({
      host: "103.59.135.43",
      port: 21,
      user: "skmftp",
      password: "Kmft@324",
      secure: false
    });
    
    // Generate a unique temporary filename to prevent collisions
    const tempFilename = crypto.randomBytes(16).toString('hex') + path.extname(filename);
    const tempPath = path.join(tempDir, tempFilename);
    
    // Navigate to the correct directory if needed (adjust as necessary)
    // await client.cd('/your/remote/directory'); 
    
    // Download the file
    console.log(`Downloading ${filename} to ${tempPath}`);
    await client.downloadTo(tempPath, filename);
    
    // Set the correct content type based on file extension
    const contentType = mime.lookup(filename) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Send the file
    res.sendFile(tempPath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      
      // Clean up the temporary file
      fs.unlink(tempPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });
    });
    
  } catch (err) {
    console.error('FTP error:', err);
    
    // Provide more specific error messages
    if (err.code === 550) {
      return res.status(404).send('File not found on FTP server');
    } else if (err.code === 'ECONNREFUSED') {
      return res.status(503).send('Cannot connect to FTP server');
    } else if (err.code === 'ETIMEDOUT') {
      return res.status(504).send('Connection to FTP server timed out');
    }
    
    res.status(500).send('Error retrieving file from FTP server');
  } finally {
    client.close();
  }
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get('/api/video', async (req, res) => {
  const filename = req.query.filename;

  // Validate filename
  if (!filename) {
    return res.status(400).send('Filename is required');
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid filename');
  }

  const client = new ftp.Client(30000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host: "103.59.135.43",
      port: 21,
      user: "skmftp",
      password: "Kmft@324",
      secure: false
    });

    const tempFilename = crypto.randomBytes(16).toString('hex') + path.extname(filename);
    const tempPath = path.join(tempDir, tempFilename);

    console.log(`Downloading ${filename} to ${tempPath}`);
    await client.downloadTo(tempPath, filename);

    const contentType = mime.lookup(filename) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Consider using res.sendFile with range support for large video files
    res.sendFile(tempPath, (err) => {
      if (err) console.error('Error sending video:', err);
      fs.unlink(tempPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp video:', unlinkErr);
      });
    });

  } catch (err) {
    console.error('FTP error:', err);
    if (err.code === 550) {
      return res.status(404).send('File not found on FTP server');
    } else if (err.code === 'ECONNREFUSED') {
      return res.status(503).send('Cannot connect to FTP server');
    } else if (err.code === 'ETIMEDOUT') {
      return res.status(504).send('Connection to FTP server timed out');
    }

    res.status(500).send('Error retrieving video from FTP server');
  } finally {
    client.close();
  }
});

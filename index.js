const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const pdf = require('pdfkit');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // change if needed
  database: 'landeep'
});

// Connect and initialize
db.connect((err) => {
  if (err) {
    console.error('DB connection error:', err.message);
    return;
  }
  console.log('Connected to MySQL.....');

  // Create table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS land_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parcel_id VARCHAR(100),
      plot_number VARCHAR(100),
      owner_name VARCHAR(100),
      area VARCHAR(100),
      location VARCHAR(100)
    )
  `;
  db.query(createTableQuery, (err) => {
    if (err) return console.error('Table creation failed:', err.message);
    console.log('land_records table ready.');

    // Check if table has data
    db.query('SELECT COUNT(*) AS count FROM land_records', (err, results) => {
      if (err) return console.error('Count check failed:', err.message);

      if (results[0].count === 0) {
        // Insert sample data
        const insertData = `
          INSERT INTO land_records (parcel_id, plot_number, owner_name, area, location) VALUES
          ('P123', '101', 'Ashutosh Kumar', '150 sq yd', 'Delhi Sector 21'),
          ('P124', '102', 'Rajeev Singh', '200 sq yd', 'Delhi Sector 22'),
          ('P125', '103', 'Priya Verma', '300 sq yd', 'Delhi Sector 23')
        `;
        db.query(insertData, (err) => {
          if (err) return console.error('Data insertion failed:', err.message);
          console.log('Sample data inserted.');
        });
      } else {
        console.log('Sample data already exists, skipping insert.');
      }
    });
  });
});

// POST /search 
app.post('/search', (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Search input is required.' });
  }

  const query = `
    SELECT * FROM land_records
    WHERE parcel_id = ? OR plot_number = ? OR owner_name = ?
  `;
  db.query(query, [input, input, input], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No records found' });
    }

    // Generate PDF and save to server
    const record = results[0];
    const doc = new pdf();
    const filename = `Land_Record_${Date.now()}.pdf`;
    const filepath = `./pdfs/${filename}`;

    // Ensure 'pdfs' folder exists
    if (!fs.existsSync('./pdfs')) fs.mkdirSync('./pdfs');

    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Land Record Summary', { align: 'center' });
    doc.moveDown();

    Object.entries(record).forEach(([key, value]) => {
      if (key !== 'id') {
        doc.fontSize(14).text(`${key.replace('_', ' ')}: ${value}`);
      }
    });

    doc.end();

    writeStream.on('finish', () => {
      res.json({
        message: 'PDF generated successfully.',
        downloadUrl: `http://localhost:3000/download/${filename}`
      });
    });
  });
});


app.get('/download/:filename', (req, res) => {
  const filePath = `./pdfs/${req.params.filename}`;
  res.download(filePath); 
});


// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

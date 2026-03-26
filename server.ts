import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const DB_FILE = path.join(process.cwd(), 'database.sqlite');
const OLD_DB_FILE = path.join(process.cwd(), 'db.json');

app.use(cors());
app.use(express.json());

let db: any;

// Database Initialization
async function initDB() {
  db = new Database(DB_FILE);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      displayName TEXT,
      role TEXT,
      specialization TEXT,
      employeeId TEXT,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT,
      nameEn TEXT,
      nationality TEXT,
      nationalityEn TEXT,
      employer TEXT,
      employerEn TEXT,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS sick_leaves (
      id TEXT PRIMARY KEY,
      patientName TEXT,
      patientNameEn TEXT,
      patientId TEXT,
      doctorId TEXT,
      doctorName TEXT,
      doctorNameEn TEXT,
      diagnosis TEXT,
      diagnosisEn TEXT,
      startDate TEXT,
      endDate TEXT,
      duration INTEGER,
      nationality TEXT,
      nationalityEn TEXT,
      employer TEXT,
      employerEn TEXT,
      doctorPosition TEXT,
      doctorPositionEn TEXT,
      admissionDate TEXT,
      dischargeDate TEXT,
      createdAt INTEGER,
      qrCodeData TEXT,
      status TEXT
    );
  `);

  // Migration from db.json if it exists and SQLite is empty
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
      const oldDataRaw = await fs.readFile(OLD_DB_FILE, 'utf-8');
      const oldData = JSON.parse(oldDataRaw);
      
      console.log('Migrating data from db.json to SQLite...');
      
      const insertUser = db.prepare('INSERT INTO users (uid, email, password, displayName, role, specialization, employeeId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const user of oldData.users) {
        insertUser.run(user.uid, user.email, user.password, user.displayName, user.role, user.specialization || null, user.employeeId || null, user.createdAt);
      }
      
      const insertPatient = db.prepare('INSERT INTO patients (id, name, createdAt) VALUES (?, ?, ?)');
      for (const patient of oldData.patients) {
        insertPatient.run(patient.id, patient.name, patient.createdAt);
      }
      
      const insertLeave = db.prepare(`
        INSERT INTO sick_leaves (
          id, patientName, patientNameEn, patientId, doctorId, doctorName, doctorNameEn, diagnosis, diagnosisEn,
          startDate, endDate, duration, nationality, nationalityEn, employer, employerEn,
          doctorPosition, doctorPositionEn, admissionDate, dischargeDate, createdAt, qrCodeData, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const leave of oldData.sick_leaves) {
        insertLeave.run(
          leave.id, leave.patientName, leave.patientNameEn, leave.patientId, leave.doctorId, leave.doctorName, leave.doctorNameEn, 
          leave.diagnosis, leave.diagnosisEn, leave.startDate, leave.endDate, leave.duration, leave.nationality, 
          leave.nationalityEn, leave.employer, leave.employerEn, leave.doctorPosition, leave.doctorPositionEn, 
          leave.admissionDate || null, leave.dischargeDate || null, leave.createdAt, leave.qrCodeData, leave.status
        );
      }
      console.log('Migration complete');
    }
  } catch (err) {
    console.log('No migration needed or db.json not found');
  }

  // Bootstrap admin user if still empty
  try {
    const adminEmail = process.env.VITE_ADMIN_EMAIL;
    if (!adminEmail) {
      console.log('No admin email configured in environment variables.');
      return;
    }
    const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    
    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const uid = 'admin-initial';
      const createdAt = Date.now();
      db.prepare('INSERT INTO users (uid, email, password, displayName, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(uid, adminEmail, hashedPassword, 'System Admin', 'admin', createdAt);
      console.log('Bootstrap admin user created');
    }
  } catch (err) {
    console.error('Bootstrap failed:', err);
  }
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, role, specialization, employeeId } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = Math.random().toString(36).substr(2, 9);
    const createdAt = Date.now();

    db.prepare('INSERT INTO users (uid, email, password, displayName, role, specialization, employeeId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uid, email, hashedPassword, displayName, role, specialization, employeeId, createdAt);

    const token = jwt.sign({ uid, role }, JWT_SECRET);
    res.json({ user: { uid, email, displayName, role, specialization, employeeId, createdAt }, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Data Routes
app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = db.prepare('SELECT * FROM sick_leaves ORDER BY createdAt DESC').all();
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaves/doctor/:doctorId', async (req, res) => {
  try {
    const leaves = db.prepare('SELECT * FROM sick_leaves WHERE doctorId = ? ORDER BY createdAt DESC').all(req.params.doctorId);
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaves/:id', async (req, res) => {
  try {
    const leave = db.prepare('SELECT * FROM sick_leaves WHERE id = ?').get(req.params.id);
    res.json(leave || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  const { 
    patientName, patientNameEn, patientId, doctorId, doctorName, doctorNameEn, diagnosis, diagnosisEn,
    startDate, endDate, duration, nationality, nationalityEn, employer, employerEn,
    doctorPosition, doctorPositionEn, admissionDate, dischargeDate 
  } = req.body;
  try {
    // Check if patient exists, if not create, if yes update with latest info
    const existingPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!existingPatient) {
      db.prepare('INSERT INTO patients (id, name, nameEn, nationality, nationalityEn, employer, employerEn, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(patientId, patientName, patientNameEn, nationality, nationalityEn, employer, employerEn, Date.now());
    } else {
      // Update patient info with latest from leave issuance
      db.prepare('UPDATE patients SET name = ?, nameEn = ?, nationality = ?, nationalityEn = ?, employer = ?, employerEn = ? WHERE id = ?').run(patientName, patientNameEn, nationality, nationalityEn, employer, employerEn, patientId);
    }

    const id = 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const createdAt = Date.now();
    const qrCodeData = `${req.headers.origin}/verify/${id}`;

    db.prepare(`
      INSERT INTO sick_leaves (
        id, patientName, patientNameEn, patientId, doctorId, doctorName, doctorNameEn, diagnosis, diagnosisEn,
        startDate, endDate, duration, nationality, nationalityEn, employer, employerEn,
        doctorPosition, doctorPositionEn, admissionDate, dischargeDate, createdAt, qrCodeData, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, patientName, patientNameEn, patientId, doctorId, doctorName, doctorNameEn, diagnosis, diagnosisEn,
      startDate, endDate, duration, nationality, nationalityEn, employer, employerEn,
      doctorPosition, doctorPositionEn, admissionDate, dischargeDate, createdAt, qrCodeData, 'active'
    );

    const newLeave = db.prepare('SELECT * FROM sick_leaves WHERE id = ?').get(id);
    res.json(newLeave);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/patients', async (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY createdAt DESC').all();
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients', async (req, res) => {
  const { id, name, nameEn, nationality, nationalityEn, employer, employerEn } = req.body;
  try {
    db.prepare('INSERT INTO patients (id, name, nameEn, nationality, nationalityEn, employer, employerEn, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, nameEn, nationality, nationalityEn, employer, employerEn, Date.now());
    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.json(newPatient);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = db.prepare('SELECT uid, email, displayName, role, specialization, employeeId, createdAt FROM users').all();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await initDB();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

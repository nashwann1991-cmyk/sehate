# Seha Sick Leave Management System

A full-stack application for managing sick leave certificates, built with React, Express, and Tailwind CSS.

## Features

- **Admin Dashboard**: Manage users and view all sick leaves.
- **Doctor Dashboard**: Issue and manage sick leave certificates.
- **Bilingual Reports**: Certificates are generated in both Arabic and English.
- **PDF Generation**: Download certificates as high-quality PDF files.
- **QR Code Verification**: Each certificate includes a unique QR code for verification.
- **Database**: Uses SQLite for persistent data storage.

## Deployment

This application is ready for deployment on any hosting service (Heroku, Vercel, DigitalOcean, AWS, etc.).

### 1. Environment Variables

Create a `.env` file (based on `.env.example`) and set the following variables:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Build and Start

```bash
# Install dependencies
npm install

# Build the React frontend
npm run build

# Start the production server
npm start
```

### 3. Docker Deployment

```bash
# Build the image
docker build -t seha-app .

# Run the container
docker run -p 3000:3000 seha-app
```

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Motion.
- **Backend**: Express, Node.js, JWT, Bcrypt.
- **PDF/QR**: jsPDF, html2canvas, qrcode.react.
- **AI**: Google Gemini API (for bilingual translation).

/**
 * Database Seeding Script
 * 
 * This script can be used to seed the database with mock data.
 * Run this from the backend directory: node ../ayushayur-frontend/mockData/seedScript.js
 * 
 * Make sure to:
 * 1. Update the MONGODB_URI in your .env file
 * 2. Install required packages: npm install mongoose
 * 3. Adjust the model imports to match your backend structure
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import models (adjust paths as needed)
// import Patient from './models/Patient.js';
// import Therapist from './models/Therapist.js';
// import Room from './models/Room.js';
// import Therapy from './models/Therapy.js';
// import Inventory from './models/Inventory.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Read JSON files
    const mockDataDir = path.join(__dirname, 'mockData');
    
    // Seed Patients
    if (fs.existsSync(path.join(mockDataDir, 'patients.json'))) {
      const patientsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'patients.json'), 'utf8'));
      // await Patient.insertMany(patientsData);
      console.log(`✓ Seeded ${patientsData.length} patients`);
    }

    // Seed Therapists
    if (fs.existsSync(path.join(mockDataDir, 'therapists.json'))) {
      const therapistsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'therapists.json'), 'utf8'));
      // await Therapist.insertMany(therapistsData);
      console.log(`✓ Seeded ${therapistsData.length} therapists`);
    }

    // Seed Rooms
    if (fs.existsSync(path.join(mockDataDir, 'rooms.json'))) {
      const roomsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'rooms.json'), 'utf8'));
      // await Room.insertMany(roomsData);
      console.log(`✓ Seeded ${roomsData.length} rooms`);
    }

    // Seed Therapies
    if (fs.existsSync(path.join(mockDataDir, 'therapies.json'))) {
      const therapiesData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'therapies.json'), 'utf8'));
      // await Therapy.insertMany(therapiesData);
      console.log(`✓ Seeded ${therapiesData.length} therapies`);
    }

    // Seed Inventory
    if (fs.existsSync(path.join(mockDataDir, 'inventory.json'))) {
      const inventoryData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'inventory.json'), 'utf8'));
      // await Inventory.insertMany(inventoryData);
      console.log(`✓ Seeded ${inventoryData.length} inventory items`);
    }

    console.log('\n✅ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Uncomment to run
// seedData();

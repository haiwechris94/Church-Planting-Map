/**
 * Drop Text Index Script
 * =======================
 * 
 * This script drops the problematic text index "name_text_description_text" 
 * from the "peoplegroups" collection that causes the "language override unsupported" error.
 * 
 * HOW TO RUN:
 * -----------
 * From the project root directory, run:
 * 
 *   node scripts/dropTextIndex.js
 * 
 * PREREQUISITES:
 * --------------
 * 1. Make sure MongoDB is running
 * 2. Ensure your .env file has the correct MONGODB_URI
 * 3. Run from the project root directory (church-planting-map)
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * 1. Connects to MongoDB using the connection string from .env
 * 2. Lists all indexes on the peoplegroups collection (for reference)
 * 3. Drops the "name_text_description_text" index
 * 4. Verifies the index was dropped
 * 5. Closes the database connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

const INDEX_NAME = 'name_text_description_text';
const COLLECTION_NAME = 'peoplegroups';

async function dropTextIndex() {
  console.log('='.repeat(60));
  console.log('Drop Text Index Script');
  console.log('='.repeat(60));
  console.log();

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log(`URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') : 'NOT SET'}`);
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set. Check your .env file.');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ Connected to MongoDB successfully\n');

    // Get the collection
    const db = mongoose.connection.db;
    const collection = db.collection(COLLECTION_NAME);

    // List current indexes
    console.log(`Current indexes on "${COLLECTION_NAME}" collection:`);
    console.log('-'.repeat(40));
    
    const indexes = await collection.indexes();
    
    if (indexes.length === 0) {
      console.log('No indexes found on this collection.');
    } else {
      indexes.forEach((index, i) => {
        console.log(`${i + 1}. ${index.name}`);
        console.log(`   Keys: ${JSON.stringify(index.key)}`);
        if (index.weights) {
          console.log(`   Weights: ${JSON.stringify(index.weights)}`);
        }
      });
    }
    console.log();

    // Check if the target index exists
    const targetIndex = indexes.find(idx => idx.name === INDEX_NAME);
    
    if (!targetIndex) {
      console.log(`⚠ Index "${INDEX_NAME}" not found on the collection.`);
      console.log('The index may have already been dropped or never existed.');
      console.log();
    } else {
      // Drop the index
      console.log(`Dropping index "${INDEX_NAME}"...`);
      
      await collection.dropIndex(INDEX_NAME);
      
      console.log(`✓ Successfully dropped index "${INDEX_NAME}"\n`);

      // Verify the index was dropped
      console.log('Verifying index removal...');
      const remainingIndexes = await collection.indexes();
      const stillExists = remainingIndexes.find(idx => idx.name === INDEX_NAME);
      
      if (stillExists) {
        console.log('✗ Warning: Index still appears to exist!');
      } else {
        console.log('✓ Verified: Index has been removed\n');
        
        console.log('Remaining indexes:');
        console.log('-'.repeat(40));
        remainingIndexes.forEach((index, i) => {
          console.log(`${i + 1}. ${index.name}`);
        });
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Script completed successfully');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('✗ ERROR:', error.message);
    console.error();
    
    if (error.code === 27) {
      console.error('The index does not exist. It may have already been dropped.');
    } else if (error.name === 'MongoNetworkError') {
      console.error('Could not connect to MongoDB. Make sure:');
      console.error('  1. MongoDB is running');
      console.error('  2. The connection string in .env is correct');
    } else {
      console.error('Full error:', error);
    }
    
    process.exit(1);
  } finally {
    // Close the connection
    try {
      await mongoose.connection.close();
      console.log('\n✓ Database connection closed');
    } catch (closeError) {
      console.error('Error closing connection:', closeError.message);
    }
  }
}

// Run the script
dropTextIndex();

/**
 * Download Population Data Script
 * Downloads CSV files from HumData.org for Cameroon population statistics
 * 
 * Usage: node scripts/downloadPopulationData.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = path.join(__dirname, '../data/population');
const METADATA_DIR = path.join(__dirname, '../../frontend/public/data');
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Metadata files to process
const METADATA_FILES = [
  'metadata-cmr_admpop2_2025-csv.json',      // ADM2 - Department level (most useful)
  'metadata-cmr_admpop_adm1_2025-csv.json',  // ADM1 - Region level
  'metadata-cmr_admpop_adm0_2025-csv.json',  // ADM0 - Country level
];

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Read metadata file and extract download URL
 */
function readMetadata(filename) {
  const filePath = path.join(METADATA_DIR, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    return {
      filename: filename,
      name: metadata.name,
      description: metadata.description,
      downloadUrl: metadata.download_url,
      format: metadata.format,
      size: metadata.size
    };
  } catch (error) {
    console.error(`❌ Error reading metadata file ${filename}:`, error.message);
    return null;
  }
}

/**
 * Download file from URL with retry logic
 */
function downloadFile(url, destPath, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${url}`);
    console.log(`   Destination: ${destPath}`);

    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`   ↪️ Redirecting to: ${response.headers.location}`);
        downloadFile(response.headers.location, destPath, retries)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        if (retries > 0) {
          console.log(`   ⚠️ HTTP ${response.statusCode}, retrying in ${RETRY_DELAY/1000}s... (${retries} retries left)`);
          setTimeout(() => {
            downloadFile(url, destPath, retries - 1)
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
          return;
        }
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`   ✅ Downloaded ${(downloadedBytes / 1024).toFixed(2)} KB`);
        resolve(destPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    });

    request.on('error', (err) => {
      if (retries > 0) {
        console.log(`   ⚠️ Network error, retrying in ${RETRY_DELAY/1000}s... (${retries} retries left)`);
        setTimeout(() => {
          downloadFile(url, destPath, retries - 1)
            .then(resolve)
            .catch(reject);
        }, RETRY_DELAY);
        return;
      }
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      if (retries > 0) {
        console.log(`   ⚠️ Timeout, retrying in ${RETRY_DELAY/1000}s... (${retries} retries left)`);
        setTimeout(() => {
          downloadFile(url, destPath, retries - 1)
            .then(resolve)
            .catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(new Error('Request timeout'));
      }
    });
  });
}

/**
 * Main download function
 */
async function downloadAllPopulationData() {
  console.log('🚀 Starting population data download from HumData.org\n');
  
  // Ensure data directory exists
  ensureDir(DATA_DIR);

  const results = {
    success: [],
    failed: []
  };

  // Process each metadata file
  for (const metadataFile of METADATA_FILES) {
    console.log(`\n📋 Processing: ${metadataFile}`);
    
    const metadata = readMetadata(metadataFile);
    if (!metadata) {
      results.failed.push({ file: metadataFile, error: 'Could not read metadata' });
      continue;
    }

    console.log(`   Name: ${metadata.name}`);
    console.log(`   Description: ${metadata.description}`);
    console.log(`   Size: ${metadata.size}`);

    // Determine output filename
    const outputFilename = metadata.name || path.basename(metadata.downloadUrl);
    const outputPath = path.join(DATA_DIR, outputFilename);

    try {
      await downloadFile(metadata.downloadUrl, outputPath);
      results.success.push({
        file: outputFilename,
        path: outputPath,
        metadata: metadata
      });
    } catch (error) {
      console.error(`   ❌ Failed to download: ${error.message}`);
      results.failed.push({
        file: metadataFile,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully downloaded: ${results.success.length} files`);
  results.success.forEach(item => {
    console.log(`   - ${item.file}`);
  });
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length} files`);
    results.failed.forEach(item => {
      console.log(`   - ${item.file}: ${item.error}`);
    });
  }

  // Save download manifest
  const manifestPath = path.join(DATA_DIR, 'download-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    downloadedAt: new Date().toISOString(),
    dataDirectory: DATA_DIR,
    files: results.success,
    failed: results.failed
  }, null, 2));
  console.log(`\n📝 Manifest saved to: ${manifestPath}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  downloadAllPopulationData()
    .then(results => {
      if (results.failed.length > 0) {
        process.exit(1);
      }
      console.log('\n✅ Download complete!');
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { downloadAllPopulationData, downloadFile, readMetadata };

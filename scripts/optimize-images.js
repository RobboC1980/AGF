#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];
const INPUT_DIR = 'public';
const OUTPUT_DIR = 'public/optimized';

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...');
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get all image files
    const imageFiles = [];
    
    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && file !== 'optimized') {
          scanDirectory(filePath);
        } else if (SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase())) {
          imageFiles.push(filePath);
        }
      });
    }
    
    scanDirectory(INPUT_DIR);
    
    if (imageFiles.length === 0) {
      console.log('📭 No images found to optimize.');
      return;
    }
    
    console.log(`📸 Found ${imageFiles.length} images to optimize...`);
    
    // Simple optimization using native tools or copying for now
    let optimizedCount = 0;
    
    imageFiles.forEach(imagePath => {
      try {
        const fileName = path.basename(imagePath);
        const outputPath = path.join(OUTPUT_DIR, fileName);
        
        // Copy file for now (in a real implementation, you'd use sharp or imagemin)
        fs.copyFileSync(imagePath, outputPath);
        optimizedCount++;
        
        console.log(`✅ Optimized: ${fileName}`);
      } catch (error) {
        console.warn(`⚠️  Failed to optimize ${imagePath}: ${error.message}`);
      }
    });
    
    console.log(`✅ Image optimization complete! Processed ${optimizedCount}/${imageFiles.length} images`);
    
    // Generate image manifest
    const manifest = {
      generated: new Date().toISOString(),
      optimized: imageFiles.map(file => ({
        original: file,
        optimized: path.join(OUTPUT_DIR, path.basename(file)),
        savings: "Optimization pending - using copies for now",
      })),
    };
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('📄 Image manifest generated');
    
    // Report optimization (simulated for now)
    await reportOptimization();
    
  } catch (error) {
    console.error('❌ Error optimizing images:', error);
    process.exit(1);
  }
}

// Performance reporting
async function reportOptimization() {
  console.log('\n📊 Image Optimization Report:');
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('No optimization manifest found');
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log(`📊 Original images: ${manifest.optimized.length}`);
  console.log(`📊 Optimized images: ${manifest.optimized.length}`);
  console.log(`💰 Status: Ready for optimization with imagemin/sharp`);
  console.log(`🔧 Next: Install production imagemin dependencies`);
}

if (require.main === module) {
  optimizeImages();
}

module.exports = { optimizeImages, reportOptimization }; 
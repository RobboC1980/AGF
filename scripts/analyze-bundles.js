#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const BUNDLE_STATS_FILE = '.next/analyze/bundle-stats.json';
const COMPONENTS_DIR = 'components';
const HOOKS_DIR = 'hooks';
const LIB_DIR = 'lib';

async function analyzeBundles() {
  console.log('📦 Starting bundle analysis...');
  
  try {
    // Run webpack-bundle-analyzer to generate stats
    console.log('🔍 Generating bundle stats...');
    await execAsync('ANALYZE=true npm run build');
    
    // Read bundle stats if available
    if (fs.existsSync(BUNDLE_STATS_FILE)) {
      const stats = JSON.parse(fs.readFileSync(BUNDLE_STATS_FILE, 'utf8'));
      await analyzeChunks(stats);
    }
    
    // Analyze component sizes
    await analyzeComponentSizes();
    
    // Analyze dependencies
    await analyzeDependencies();
    
    console.log('✅ Bundle analysis complete!');
    
  } catch (error) {
    console.error('❌ Error analyzing bundles:', error);
    process.exit(1);
  }
}

async function analyzeChunks(stats) {
  console.log('\n📊 Chunk Analysis:');
  
  const chunks = stats.chunks || [];
  const sortedChunks = chunks
    .map(chunk => ({
      name: chunk.names[0] || 'unnamed',
      size: chunk.size,
      files: chunk.files,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  console.log('🎯 Top 10 Largest Chunks:');
  sortedChunks.forEach((chunk, index) => {
    const sizeMB = (chunk.size / 1024 / 1024).toFixed(2);
    console.log(`${index + 1}. ${chunk.name}: ${sizeMB} MB`);
  });
  
  // Identify optimization opportunities
  const recommendations = [];
  
  if (sortedChunks.find(c => c.name.includes('vendor') && c.size > 500000)) {
    recommendations.push('🔧 Consider splitting vendor chunks further');
  }
  
  if (sortedChunks.find(c => c.name.includes('main') && c.size > 250000)) {
    recommendations.push('🔧 Consider code splitting for main chunk');
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Optimization Recommendations:');
    recommendations.forEach(rec => console.log(rec));
  }
}

async function analyzeComponentSizes() {
  console.log('\n📊 Component Size Analysis:');
  
  const componentSizes = [];
  
  function analyzeDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        analyzeDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const size = stat.size;
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        
        componentSizes.push({
          file: filePath,
          size,
          lines,
          complexity: calculateComplexity(content),
        });
      }
    });
  }
  
  [COMPONENTS_DIR, HOOKS_DIR, LIB_DIR].forEach(dir => {
    analyzeDirectory(dir);
  });
  
  // Sort by size and show top 10
  const sortedComponents = componentSizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  console.log('🎯 Top 10 Largest Components:');
  sortedComponents.forEach((comp, index) => {
    const sizeKB = (comp.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${comp.file}: ${sizeKB} KB (${comp.lines} lines, complexity: ${comp.complexity})`);
  });
  
  // Identify optimization opportunities
  const recommendations = [];
  
  const largeComponents = componentSizes.filter(c => c.size > 10000);
  if (largeComponents.length > 0) {
    recommendations.push(`🔧 Consider splitting ${largeComponents.length} large components (>10KB)`);
  }
  
  const complexComponents = componentSizes.filter(c => c.complexity > 50);
  if (complexComponents.length > 0) {
    recommendations.push(`🔧 Consider refactoring ${complexComponents.length} complex components`);
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Component Optimization Recommendations:');
    recommendations.forEach(rec => console.log(rec));
  }
}

async function analyzeDependencies() {
  console.log('\n📊 Dependency Analysis:');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Get package sizes (simplified analysis)
  const heavyDeps = [
    '@radix-ui/react-accordion',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@tanstack/react-query',
    'framer-motion',
    'recharts',
    'react',
    'react-dom',
    'next',
  ];
  
  const usedHeavyDeps = heavyDeps.filter(dep => dependencies[dep]);
  
  console.log('🎯 Heavy Dependencies in Use:');
  usedHeavyDeps.forEach(dep => {
    console.log(`- ${dep}: ${dependencies[dep]}`);
  });
  
  // Check for unused dependencies
  const allFiles = [];
  
  function scanForImports(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanForImports(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        allFiles.push(content);
      }
    });
  }
  
  scanForImports('./');
  
  const allContent = allFiles.join('\n');
  const unusedDeps = Object.keys(dependencies).filter(dep => {
    // Skip Next.js and build tools
    if (dep.startsWith('@types/') || dep.includes('eslint') || dep.includes('jest') || dep.includes('next')) {
      return false;
    }
    return !allContent.includes(dep);
  });
  
  if (unusedDeps.length > 0) {
    console.log('\n🧹 Potentially Unused Dependencies:');
    unusedDeps.forEach(dep => console.log(`- ${dep}`));
  }
  
  // Performance recommendations
  const recommendations = [];
  
  if (dependencies['framer-motion'] && allContent.includes('framer-motion')) {
    recommendations.push('🔧 Consider using React 18 transitions instead of Framer Motion for simple animations');
  }
  
  if (dependencies['recharts'] && allContent.includes('recharts')) {
    recommendations.push('🔧 Consider lazy loading charts components');
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Dependency Optimization Recommendations:');
    recommendations.forEach(rec => console.log(rec));
  }
}

function calculateComplexity(content) {
  // Simple complexity calculation based on various factors
  let complexity = 0;
  
  // Count conditional statements
  complexity += (content.match(/if\s*\(/g) || []).length;
  complexity += (content.match(/\?\s*.*\s*:/g) || []).length;
  complexity += (content.match(/switch\s*\(/g) || []).length;
  
  // Count loops
  complexity += (content.match(/for\s*\(/g) || []).length;
  complexity += (content.match(/while\s*\(/g) || []).length;
  complexity += (content.match(/\.map\s*\(/g) || []).length;
  complexity += (content.match(/\.filter\s*\(/g) || []).length;
  
  // Count function definitions
  complexity += (content.match(/function\s+\w+/g) || []).length;
  complexity += (content.match(/const\s+\w+\s*=\s*\(/g) || []).length;
  
  // Count hooks
  complexity += (content.match(/use\w+\s*\(/g) || []).length;
  
  return complexity;
}

// Generate optimization report
async function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    analysis: 'Bundle Analysis Complete',
    recommendations: [],
    metrics: {
      totalComponents: 0,
      totalSize: 0,
      averageComplexity: 0,
    },
  };
  
  fs.writeFileSync(
    'bundle-analysis-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Bundle analysis report generated: bundle-analysis-report.json');
}

if (require.main === module) {
  analyzeBundles().then(() => generateReport());
}

module.exports = { analyzeBundles, generateReport }; 
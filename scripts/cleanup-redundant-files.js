#!/usr/bin/env node

/**
 * Cleanup script for AgileForge codebase
 * Identifies and optionally removes redundant files and directories
 */

const fs = require('fs')
const path = require('path')

const REDUNDANT_PATTERNS = [
  // Temporary files
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/.tmp',
  
  // Build artifacts
  '**/.next/cache',
  '**/dist/',
  
  // Python cache
  '**/__pycache__',
  '**/*.pyc',
  
  // Logs
  '**/*.log',
  '**/logs/',
  
  // IDE files
  '**/.vscode/settings.json',
  '**/.idea/',
]

const POTENTIALLY_REDUNDANT_FILES = [
  // Multiple backend implementations
  './simple_backend.py', // If main backend is in ./backend/
  
  // Duplicate frontend directories
  './frontend/', // If using Next.js app directory
  
  // Old configuration files
  './old-config.json',
  './config.old.js',
]

function analyzeRedundancy() {
  console.log('🔍 Analyzing codebase for redundant files...\n')
  
  const issues = []
  
  // Check for duplicate backend implementations
  const hasMainBackend = fs.existsSync('./backend/main.py')
  const hasSimpleBackend = fs.existsSync('./simple_backend.py')
  
  if (hasMainBackend && hasSimpleBackend) {
    issues.push({
      type: 'duplicate_backend',
      message: 'Multiple backend implementations detected',
      files: ['./backend/main.py', './simple_backend.py'],
      suggestion: 'Consider removing simple_backend.py if backend/main.py is the primary implementation'
    })
  }
  
  // Check for duplicate frontend directories
  const hasNextJsApp = fs.existsSync('./app/page.tsx')
  const hasFrontendDir = fs.existsSync('./frontend/')
  
  if (hasNextJsApp && hasFrontendDir) {
    issues.push({
      type: 'duplicate_frontend',
      message: 'Multiple frontend implementations detected',
      files: ['./app/', './frontend/'],
      suggestion: 'Consider removing ./frontend/ if using Next.js app directory'
    })
  }
  
  // Check for large component files that should be refactored
  const largeComponents = []
  const componentsDir = './components/'
  
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir)
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(componentsDir, file)
        const stats = fs.statSync(filePath)
        if (stats.size > 50000) { // 50KB
          largeComponents.push({
            file: filePath,
            size: Math.round(stats.size / 1024) + 'KB'
          })
        }
      }
    })
  }
  
  if (largeComponents.length > 0) {
    issues.push({
      type: 'large_components',
      message: 'Large component files detected (candidates for refactoring)',
      files: largeComponents.map(c => `${c.file} (${c.size})`),
      suggestion: 'Consider breaking these into smaller, reusable components'
    })
  }
  
  // Check for unused environment files
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production']
  const unusedEnvFiles = envFiles.filter(file => {
    if (!fs.existsSync(file)) return false
    const content = fs.readFileSync(file, 'utf8')
    return content.trim().length === 0
  })
  
  if (unusedEnvFiles.length > 0) {
    issues.push({
      type: 'empty_env_files',
      message: 'Empty environment files detected',
      files: unusedEnvFiles,
      suggestion: 'Consider removing empty .env files'
    })
  }
  
  return issues
}

function generateReport(issues) {
  console.log('📊 Redundancy Analysis Report\n')
  console.log('=' * 50)
  
  if (issues.length === 0) {
    console.log('✅ No major redundancy issues detected!')
    return
  }
  
  issues.forEach((issue, index) => {
    console.log(`\n${index + 1}. ${issue.message}`)
    console.log('   Type:', issue.type)
    console.log('   Files:')
    issue.files.forEach(file => {
      console.log(`     - ${file}`)
    })
    console.log(`   💡 Suggestion: ${issue.suggestion}`)
  })
  
  console.log('\n' + '=' * 50)
  console.log(`\n📈 Summary: ${issues.length} potential improvements identified`)
}

function generateCleanupScript(issues) {
  const script = issues
    .filter(issue => issue.type === 'duplicate_backend' || issue.type === 'empty_env_files')
    .map(issue => {
      if (issue.type === 'duplicate_backend') {
        return '# Remove duplicate backend\n# rm simple_backend.py  # Uncomment to execute'
      }
      if (issue.type === 'empty_env_files') {
        return issue.files.map(file => `# rm ${file}  # Empty env file`).join('\n')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
  
  if (script) {
    fs.writeFileSync('./cleanup-commands.sh', script)
    console.log('\n📝 Generated cleanup-commands.sh with suggested removals')
    console.log('   Review and uncomment lines to execute cleanup')
  }
}

// Main execution
function main() {
  console.log('🧹 AgileForge Codebase Cleanup Analysis\n')
  
  const issues = analyzeRedundancy()
  generateReport(issues)
  generateCleanupScript(issues)
  
  console.log('\n🔧 Next Steps:')
  console.log('1. Review the suggestions above')
  console.log('2. Use the new shared components from /components/shared/')
  console.log('3. Migrate large components to use useEntityManagement hook')
  console.log('4. Run npm run test to ensure everything works')
  console.log('5. Check cleanup-commands.sh for safe removal commands')
}

if (require.main === module) {
  main()
}

module.exports = { analyzeRedundancy, generateReport } 
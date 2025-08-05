# PowerShell Script to Fix Large Files Issue
Write-Host "🔧 Fixing Large Files Issue..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Step 1: Remove large files from current state
Write-Host "📋 Step 1: Removing large files from current state..." -ForegroundColor Yellow
git rm --cached "Step3_Frontend_Development/node_modules/.cache/default-development/12.pack" 2>$null
git rm --cached "Step3_Frontend_Development/node_modules/.cache/default-development/18.pack" 2>$null

# Step 2: Remove all node_modules from tracking
Write-Host "📋 Step 2: Removing all node_modules from tracking..." -ForegroundColor Yellow
git rm -r --cached "Step3_Frontend_Development/node_modules" 2>$null

# Step 3: Add .gitignore files
Write-Host "📋 Step 3: Adding .gitignore files..." -ForegroundColor Yellow
git add .gitignore 2>$null
git add Step3_Frontend_Development/.gitignore 2>$null

# Step 4: Add the fix scripts
Write-Host "📋 Step 4: Adding fix scripts..." -ForegroundColor Yellow
git add fix-git-push.ps1 2>$null
git add fix-git-push-simple.bat 2>$null
git add fix-git-push.bat 2>$null
git add fix-git-push.sh 2>$null

# Step 5: Add all other files except node_modules
Write-Host "📋 Step 5: Adding all other files..." -ForegroundColor Yellow
git add . 2>$null

# Step 6: Create a new commit
Write-Host "📋 Step 6: Creating new commit..." -ForegroundColor Yellow
git commit -m "Fix: Remove large files and clean repository" 2>$null

# Step 7: Force push to replace the problematic history
Write-Host "📋 Step 7: Force pushing to replace history..." -ForegroundColor Yellow
Write-Host "⚠️  This will replace the remote history. Continue? (y/N)" -ForegroundColor Red
$response = Read-Host
if ($response -eq "y" -or $response -eq "Y") {
    git push --force origin main
    Write-Host "✅ Force push completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Force push cancelled." -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check your GitHub repository" -ForegroundColor White
Write-Host "2. Verify that the large files are gone" -ForegroundColor White
Write-Host "3. Your commits should now be visible" -ForegroundColor White

Read-Host "Press Enter to continue" 
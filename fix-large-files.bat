@echo off
echo 🔧 Fixing Large Files Issue...
echo ================================

echo 📋 Step 1: Removing large files from current state...
git rm --cached "Step3_Frontend_Development/node_modules/.cache/default-development/12.pack" 2>nul
git rm --cached "Step3_Frontend_Development/node_modules/.cache/default-development/18.pack" 2>nul

echo 📋 Step 2: Removing all node_modules from tracking...
git rm -r --cached "Step3_Frontend_Development/node_modules" 2>nul

echo 📋 Step 3: Adding .gitignore files...
git add .gitignore 2>nul
git add Step3_Frontend_Development/.gitignore 2>nul

echo 📋 Step 4: Adding fix scripts...
git add fix-git-push.ps1 2>nul
git add fix-git-push-simple.bat 2>nul
git add fix-git-push.bat 2>nul
git add fix-git-push.sh 2>nul

echo 📋 Step 5: Adding all other files...
git add . 2>nul

echo 📋 Step 6: Creating new commit...
git commit -m "Fix: Remove large files and clean repository" 2>nul

echo 📋 Step 7: Force pushing to replace history...
echo ⚠️  This will replace the remote history. Continue? (y/N)
set /p response=
if /i "%response%"=="y" (
    git push --force origin main
    echo ✅ Force push completed!
) else (
    echo ❌ Force push cancelled.
)

echo.
echo 🎯 Next Steps:
echo 1. Check your GitHub repository
echo 2. Verify that the large files are gone
echo 3. Your commits should now be visible

pause 
@echo off
echo Adding frontend files to Step3_Frontend_Development...

REM Add all the new frontend files
git add Step3_Frontend_Development/src/
git add Step3_Frontend_Development/package.json
git add Step3_Frontend_Development/public/

REM Check what's staged
git status

REM Commit the changes
git commit -m "Add frontend source files: React app with TypeScript, CSS, and HTML"

REM Push to GitHub
git push origin main

echo Done! The Step3_Frontend_Development folder should now show content on GitHub.
pause 
@echo off
echo Committing Step3_Frontend_Development...

REM Add the Step3 directory files (excluding node_modules)
git add Step3_Frontend_Development/.gitignore
git add Step3_Frontend_Development/README.md
git add Step3_Frontend_Development/src/

REM Commit the changes
git commit -m "Add Step3_Frontend_Development: Frontend application structure and documentation"

REM Push to GitHub
git push origin main

echo Done! Step3_Frontend_Development should now be visible on GitHub.
pause 
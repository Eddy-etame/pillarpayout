@echo off
echo Adding Step3_Frontend_Development to git...

REM Add the .gitignore file first
git add Step3_Frontend_Development/.gitignore

REM Add all files in src directory (excluding node_modules)
git add Step3_Frontend_Development/src/

REM Add any other important files
git add Step3_Frontend_Development/package.json 2>nul
git add Step3_Frontend_Development/package-lock.json 2>nul
git add Step3_Frontend_Development/tsconfig.json 2>nul
git add Step3_Frontend_Development/tailwind.config.js 2>nul
git add Step3_Frontend_Development/postcss.config.js 2>nul
git add Step3_Frontend_Development/Dockerfile 2>nul
git add Step3_Frontend_Development/public/ 2>nul

REM Check status
git status

echo Done!
pause 
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Push SEEK frontend to GitHub

echo ============================================================
echo   SEEK frontend  ->  GitHub
echo ------------------------------------------------------------
echo   This script will:
echo     1. open the GitHub "new repository" page in your browser
echo     2. add the remote and push (a browser login window pops up)
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a git repository.
  pause
  exit /b 1
)

git remote get-url origin >nul 2>nul
if not errorlevel 1 (
  echo Remote "origin" already set to:
  git remote get-url origin
  echo.
  goto PUSH
)

set /p GHUSER=GitHub username [Lidazou]: 
if "%GHUSER%"=="" set GHUSER=Lidazou

set /p REPONAME=Repository name [seek-web]: 
if "%REPONAME%"=="" set REPONAME=seek-web

echo.
echo Opening: https://github.com/new
echo.
echo   Repository name : %REPONAME%
echo   Visibility      : Public  (needed for free GitHub Pages)
echo   IMPORTANT       : do NOT tick "Add a README" / ".gitignore" / "license"
echo.
start "" "https://github.com/new?name=%REPONAME%&visibility=public"

echo After you click "Create repository", come back here.
pause

git remote add origin "https://github.com/%GHUSER%/%REPONAME%.git"
if errorlevel 1 (
  echo [ERROR] could not add remote.
  pause
  exit /b 1
)

:PUSH
echo.
echo Pushing to origin/main ...
echo A GitHub login window may pop up - sign in with your account.
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo [FAILED] push did not complete. Common causes:
  echo   - the repository was not created yet
  echo   - wrong username / repository name
  echo   - login window was closed
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   DONE. Repository pushed.
echo ------------------------------------------------------------
echo   Next: turn on GitHub Pages
echo     Settings -^> Pages -^> Source: Deploy from a branch
echo     Branch: main   /   Folder: / (root)
echo.
echo   Your site will be:
echo     https://%GHUSER%.github.io/%REPONAME%/
echo ============================================================
echo.
start "" "https://github.com/%GHUSER%/%REPONAME%/settings/pages"
pause

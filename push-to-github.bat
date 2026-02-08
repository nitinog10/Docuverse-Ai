@echo off
echo ========================================
echo Pushing to GitHub with new branch
echo ========================================
echo.

echo Step 1: Checking current status...
git status
echo.

echo Step 2: Creating new branch 'feature/documentation-and-fixes'...
git checkout -b feature/documentation-and-fixes
echo.

echo Step 3: Adding all changes...
git add .
echo.

echo Step 4: Committing changes...
git commit -m "feat: Add documentation generation and fix CORS/parser/sandbox issues" -m "- Add comprehensive documentation generation feature" -m "  - New DocumentationGenerator service to analyze repos" -m "  - API endpoints for generating/viewing documentation" -m "  - Frontend page with beautiful UI for repo docs" -m "  - Shows stats, README, API reference, functions, classes" -m "" -m "- Fix CORS errors" -m "  - Updated CORS middleware with explicit origins" -m "  - Added expose_headers for better compatibility" -m "" -m "- Fix tree-sitter parser" -m "  - Updated Language initialization for new API" -m "  - Added proper error handling" -m "" -m "- Fix sandbox execution on Windows" -m "  - Switched from asyncio to subprocess.run" -m "  - Better error messages and logging" -m "  - More lenient security patterns" -m "" -m "- Add Documentation button to repository page" -m "- Improve error handling across all services"
echo.

echo Step 5: Pushing to GitHub...
git push -u origin feature/documentation-and-fixes
echo.

echo ========================================
echo Done! 
echo.
echo Next steps:
echo 1. Go to your GitHub repository
echo 2. You should see a prompt to create a Pull Request
echo 3. Click "Compare & pull request"
echo 4. Review changes and merge to main
echo ========================================
pause

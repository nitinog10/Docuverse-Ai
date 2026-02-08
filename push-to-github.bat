@echo off
echo ========================================
echo Pushing fixes to GitHub
echo ========================================
echo.

echo Step 1: Checking current status...
git status
echo.

echo Step 2: Creating new branch 'fix/cors-parser-sandbox'...
git checkout -b fix/cors-parser-sandbox
echo.

echo Step 3: Adding all changes...
git add .
echo.

echo Step 4: Committing changes...
git commit -m "fix: CORS, tree-sitter parser, and sandbox execution issues" -m "- Fix CORS errors" -m "  - Updated CORS middleware with explicit origins" -m "  - Added expose_headers for better compatibility" -m "  - Support both localhost and 127.0.0.1" -m "" -m "- Fix tree-sitter parser" -m "  - Updated Language initialization for new tree-sitter API" -m "  - Use set_language() method instead of passing to Parser" -m "  - Added proper error handling" -m "" -m "- Fix sandbox execution on Windows" -m "  - Switched from asyncio.create_subprocess_exec to subprocess.run" -m "  - Resolves NotImplementedError on Windows" -m "  - Better error messages and logging" -m "  - More lenient security patterns (allow basic file operations)" -m "" -m "- Improve error handling and logging across services"
echo.

echo Step 5: Pushing to GitHub...
git push -u origin fix/cors-parser-sandbox
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

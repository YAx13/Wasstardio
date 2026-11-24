@echo off
title Running Game Local Server
cd /d "%~dp5"
start http://localhost:8000
npx http-server -p 8000
pause
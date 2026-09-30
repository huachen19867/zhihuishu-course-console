@echo off
if not exist "%~dp0..\runtime" mkdir "%~dp0..\runtime"
type nul > "%~dp0..\runtime\STOP"

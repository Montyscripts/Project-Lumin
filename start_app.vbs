Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory of the current script to ensure correct path resolution
scriptPath = WScript.ScriptFullName
scriptDir = fso.GetParentFolderName(scriptPath)
WshShell.CurrentDirectory = scriptDir

' 1. Verify Node.js is installed silently
On Error Resume Next
WshShell.Run "node -v", 0, True
If Err.Number <> 0 Then
    MsgBox "Node.js is not installed or not in your PATH. Please install Node.js from https://nodejs.org/ first.", 16, "Project - LUMIN - Launcher Error"
    WScript.Quit 1
End If
On Error GoTo 0

' 2. Check if node_modules folder exists, if not run npm install silently
If Not fso.FolderExists("node_modules") Then
    ' Run npm install in hidden window and wait for completion (True)
    WshShell.Run "cmd.exe /c npm install", 0, True
End If

' 3. Start the development server silently in the background
' Using 0 (hidden window) and False (do not wait for it to finish)
WshShell.Run "cmd.exe /c npm run dev", 0, False

' 4. Wait for the server to be fully active on port 5173
' We run a silent PowerShell check that loops until connection succeeds
powershellCmd = "powershell -WindowStyle Hidden -Command ""while ($true) { try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 5173); if ($c.Connected) { $c.Close(); break; } } catch {} Start-Sleep -Milliseconds 250 }"""
WshShell.Run powershellCmd, 0, True

' 5. Open the application in Google Chrome if available, otherwise default browser
chromePath = ""
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    chromePath = """C:\Program Files\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
    chromePath = """C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe") Then
    chromePath = """" & WshShell.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe"""
End If

If chromePath <> "" Then
    WshShell.Run chromePath & " http://localhost:5173", 1, False
Else
    WshShell.Run "cmd.exe /c start http://localhost:5173", 0, False
End If

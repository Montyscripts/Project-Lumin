; ============================================================
; LUMIN AI Agent - Inno Setup Script
; ============================================================
; Builds standalone Windows installer for LUMIN Local AI Agent

#define MyAppName "LUMIN"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "LUMIN AI Project"
#define MyAppURL "https://github.com/Montyscripts/Project-Lumin"
; Primary launch target (Lumin.exe is the preferred production entry point, created from start_app.bat via Bat-to-Exe or equivalent)
#define MyAppExeName "Lumin.exe"
#define MyAppIcon "icon.ico"

[Setup]
AppId={{D37E84B2-1B59-4F58-9A2E-8E5A0B1A7C20}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\LUMIN
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
OutputDir=..\dist_installer
OutputBaseFilename=LUMIN_Setup_v1.0.0
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\public\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableProgramGroupPage=auto

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; ---- Primary Executable & Core Startup Scripts ----
Source: "..\Lumin.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start_app.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start_app_debug.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start_agent.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stop_app.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\install_windows.bat"; DestDir: "{app}"; Flags: ignoreversion

; ---- Root Configuration & Runtime Files ----
Source: "..\agent.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\vite.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\metadata.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\agent_config.example.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.ico"; DestDir: "{app}\installer"; Flags: ignoreversion

; ---- Application Subsystems & Source Modules ----
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\core\*"; DestDir: "{app}\core"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\llm\*"; DestDir: "{app}\llm"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\tools\*"; DestDir: "{app}\tools"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\memory\*"; DestDir: "{app}\memory"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\audio\*"; DestDir: "{app}\audio"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\lumin_context\*"; DestDir: "{app}\lumin_context"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".aistudio*"
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\utils\*"; DestDir: "{app}\utils"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__*,*.pyc"
Source: "..\installer\*"; DestDir: "{app}\installer"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.iss"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Comment: "Launch LUMIN Local AI Agent"
Name: "{group}\{#MyAppName} (Debug Mode)"; Filename: "{app}\start_app_debug.bat"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Comment: "Launch LUMIN in Foreground Debug Mode"
Name: "{group}\{#MyAppName} (CLI Agent)"; Filename: "{app}\start_agent.bat"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Comment: "Launch LUMIN CLI Interactive Agent"
Name: "{group}\Stop LUMIN Services"; Filename: "{app}\stop_app.bat"; WorkingDir: "{app}"; Comment: "Terminate LUMIN Background Services"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"; Tasks: desktopicon; Comment: "Launch LUMIN Local AI Agent"

[Run]
; Run automated post-installation environment setup silently
Filename: "{app}\installer\post_install.bat"; StatusMsg: "Configuring LUMIN environment (Python venv + frontend packages)..."; Flags: runhidden waituntilterminated
; Offer to launch LUMIN upon completion
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

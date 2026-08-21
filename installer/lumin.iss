#define MyAppName "LUMIN"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Montyscripts"
#define MyAppURL "https://github.com/Montyscripts/Project-Lumin"
#define MyAppExeName "LUMIN.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\LUMIN
DefaultGroupName=LUMIN
DisableProgramGroupPage=yes
LicenseFile=license.txt
OutputDir=..\dist
OutputBaseFilename=LUMIN-Setup-{#MyAppVersion}
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\LUMIN.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Core application files (no venv, no node_modules)
Source: "..\LUMIN.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\agent.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start_app.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start_app_debug.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stop_app.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\install_windows.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\vite.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\agent_config.example.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion

; Important folders
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\core\*"; DestDir: "{app}\core"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\llm\*"; DestDir: "{app}\llm"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\memory\*"; DestDir: "{app}\memory"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\tools\*"; DestDir: "{app}\tools"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\utils\*"; DestDir: "{app}\utils"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\audio\*"; DestDir: "{app}\audio"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\lumin_context\*"; DestDir: "{app}\lumin_context"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

; Installer helper files
Source: "post_install.bat"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "license.txt"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "icon.ico"; DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{group}\LUMIN"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Uninstall LUMIN"; Filename: "{uninstallexe}"
Name: "{autodesktop}\LUMIN"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; After files are copied, run the dependency installer
Filename: "{app}\installer\post_install.bat"; StatusMsg: "Installing Python, Node.js, Ollama and dependencies... This may take several minutes."; Flags: runhidden waituntilterminated

; Offer to launch at the end
Filename: "{app}\{#MyAppExeName}"; Description: "Launch LUMIN"; Flags: nowait postinstall skipifsilent

[Code]
// Optional: you can add more Pascal script here later for better progress UI
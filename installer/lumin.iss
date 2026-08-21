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
; Copy the whole project except heavy/dev-only folders
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "venv\*;node_modules\*;.git\*;dist\*;installer\*;*.log;agent_memory.json;__pycache__\*;*.pyc"

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
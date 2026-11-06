FLOAT — PORTABLE WINDOWS APP

INSTALL

Run Float-Setup.exe to choose where Float is installed. The suggested folder is per-user and usually needs no administrator access. The installer has a moving sailboat, clear progress feedback, a Start menu shortcut, and an optional desktop shortcut. Uninstall Float from Windows Settings > Apps.

TRUST NOTICE

Float-Setup.exe and Float.exe are not digitally signed. Microsoft Defender SmartScreen may show an unrecognized-app warning for a new or uncommon download. This warning is about publisher and file reputation; it is not, by itself, a malware finding. Do not run a copy unless you trust its source. A SHA-256 checksum can confirm the download matches the published file, but it does not prove the file is safe.

PORTABLE

1. Extract the entire Float-Portable folder.
2. Double-click Float.exe.

Float.exe is a small, windowless launcher with the Float PowerShell app embedded inside it. It uses Windows PowerShell and .NET Framework included with Windows; nothing needs to be installed. The app script is unpacked to a temporary folder only while Float is open, then removed when you close it.

The app has Write, Settings, and History tabs. Choose a visible, open app window in Write; its list refreshes whenever you open it, excludes hidden windows and owned dialogs, and can also be updated with Refresh list. Nothing is selected automatically. Click inside the destination's text area before the countdown ends. Float stops if the destination closes or focus moves to another app.

History shows recent text Float has typed and clipboard text you manually add. Select an item to preview its full text, reuse it in the editor, or copy it.
The interface scales for Windows display DPI and readjusts when resized; Settings can scroll on compact screens. Its sailboat mark floats smoothly without blinking.

Float sends Unicode keyboard input, including Chinese, Russian, and other scripts; it does not need language packs or plugins. Enter or paste text using your Windows keyboard layout or IME (for Chinese, use a Windows Chinese IME). The destination app must support Unicode. Choose an installed editor font, size, bold, and italic in Settings. These affect the editor and history preview only, not formatting in the destination app.

Up to 50 recent text items are kept in memory for the current session only. Clipboard contents are never monitored automatically; they are added only when you choose Add clipboard. Recent text and clipboard history are cleared when Float closes.

FloatLauncher.cs, Float.ps1, FloatSetup.cs, and both build scripts are included for rebuilding or customizing the app. To rebuild on Windows with .NET Framework 4.x, run:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Build Float.exe.ps1"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Build Float Setup.exe.ps1"

Float-logo.svg is the scalable Float logo. The executable also uses its icon.

Made with care by SMARTSERVE.


/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/
/*eslint-env browser, amd*/
define({//Default message bundle
	"Accessibility": "Accessibility",
	"Globalization": "Globalization",
	"Enable bidi support": "Enable bidi support",
	"Base text direction": "Base text direction",
	"Calendar type": "Calendar type",
	"Left-To-Right": "Left-To-Right",
	"Right-To-Left": "Right-To-Left",
	"Auto direction": "Auto direction",
	"Gregorian": "Gregorian",
	"Hebrew": "Hebrew",
	"Islamic": "Islamic",
	"Plugin Description": "Plug-in Description",
	"Create": "Create",
	"Loading...": "Loading...",
	"Label:": "Label:",
	"Title": "Title",
	"Plugins": "Plug-ins",
	"User Profile": "User Profile",
	"Git": "Git",
	"Git Settings": "Git Settings",
	"JavascriptAssist": "Tern",
	"Theme":"Theme",
	"Editor Theme Title":"Editor Theme",
	"Editor Theme":"Editor Theme:",
	"Theme Settings": "Theme Settings",
	"IDETheme": "IDE Theme",
	"General": "General",
	"fileNavigation": "File Navigation",
	"desktopSelectionPolicy": "Desktop selection policy (Ctrl+Click, Shift+Click, Cmd+Click):",
	"desktopSelectionPolicyTooltip": "The policy applies to the cases when a file or folder link is clicked while Ctrl, Shift or Cmd keys are pressed. The file or folder will be selected if this policy is checked. Otherwise the file or folder link will be opened in a new tab or window as the normal web behavior.",
	"filteredResources": "Filtered Resources (comma-separated list):",
	"filteredResourcesTooltip": "The comma-separated list of resources to be filtered from view and searching. Specify * to match one or more characters. Specify ? to match a single character.",
	"Files": "Files",
	"enableEditorTabs": "Enable Editor Tab Support (Works in Desktop selection policy)",
	"enableEditorTabsTooltip": "Enables the display and management of multiple files on the editor page.",
	"maximumEditorTabs": "Maximum Allowed Editor Tabs (0 for unlimited)",
	"maximumEditorTabsTooltip": "Controls the maximum number of editor tabs to be open at any given time. Use 0 for unlimited.",
	"EditorTabs": "Editor Tabs",
	"enableDebugger": "Enable Debugger Support",
	"enableDebuggerTooltip": "Enables the debugger frontend to let you connect to a debugger backend.",
	"Debugger": "Debugger",
	"Navigation": "Navigation",
	"Font": "Font",
	"Family": "Family",
	"Sans Serif": "Sans Serif",
	"Serif": "Serif",
	"Size": "Size",
	"8pt": "8pt",
	"9pt": "9pt",
	"10pt": "10pt",
	"12pt": "12pt",
	"Color": "Color",
	"Background": "Background",
	"blue": "blue",
	"Weight": "Weight",
	"Normal": "Normal",
	"Bold": "Bold",
	"green": "green",
	"darkred": "darkred",
	"Categories": "Categories",
	"User Name": "User Name:",
	"Full Name": "Full Name:",
	"Email Address": "Email Address:",
	"Email Confirmed": "Email Confirmed:",
	"Account": "Account",
	"Current Password": "Current Password:",
	"New Password": "New Password:",
	"Verify Password": "Verify Password:",
	"UserSettings.PasswordsDoNotMatch": "New password, and retyped password do not match",
	"UserSettings.TypeCurrentPassword": "You must type your current password in order to set a new one",
	"UserSettings.InvalidPasswordLength": "Password must be at least 8 characters long",
	"UserSettings.InvalidPasswordAlpha": "Password must contain at least one alpha character and one non alpha character",
	"UserSettings.PasswordRules": "Password must be at least 8 characters long and contain at least one alpha character and one non alpha character",
	"Password": "Password",
	"Google": "Google",
	"Unlink": "Unlink",
	"Link": "Link",
	"Unlinked": "Unlinked",
	"Linked": "Linked",
	"Linked Accounts": "Linked Accounts",
	"Git Email Address": "Git Email Address:",
	"Git Username": "Git Username:",
	"Git Credentials Storage": "Git Credentials Storage",
	"Update": "Update",
	"Update Profile Settings": "Update Profile Settings",
	"Update Git User Settings": "Update Git User Settings",
	"Update Git Credentials": "Update Git Credentials",
	"UsrProfileUpdateSuccess": "User profile data successfully updated.",
	"GitUsrUpdateSuccess": "Git user data successfully updated.",
	"GitCredsUpdateSuccess": "Git Credentials successfully updated.",
	"Install Plugin": "Install Plug-in",
	"Plugin Name:": "Plug-in Name:",
	"Author Name:": "Author Name:",
	"Licence:": "Licence:",
	"Description:": "Description:",
	"OrionPlugin": "A plug-in for Orion",
	"Plugin Link": "Plug-in Link",
	"Install": "Install",
	"PlugInstallByURL": "Install a plug-in by specifying its URL",
	"Plugin URL:": "Plug-in URL:",
	"Disable": "Disable",
	"Disabled":"Disabled ${0}",
	"DisableTooltip": "Disable the plug-in",
	"Visualizations": "Visualizations",
	"hideCodeMap": "Hide Code Map",
	"disableCodeFolding": "Disable Code Folding",
	"disableCodeFoldingTooltip": "Disables hiding of blocks of code in the editor",
	"Keyboard": "Keyboard",
	"shortcutInfoMac.md": "`Ctrl+Shift+?` lists the key bindings for the current page. The list can be filtered, and key bindings can be edited.\n\n#### Common shortcuts:\n\n- `Cmd+M` switches between Traversal Mode and Insert Tab Character Mode in the code editor\n\n- `Ctrl+Space` for code completion (content assist) in the editor\n\n- `Shift+F1` shows a tooltip (if available) for the current caret position or focused control, which can be closed with `Esc`\n\n- `Shift+F10` opens a context menu\n\n- `Cmd++` zoom in, `Cmd+-` zoom out, `Cmd+0` reset",
	"shortcutInfoWin.md": "`Alt+Shift+?` lists the key bindings for the current page. The list can be filtered, and key bindings can be edited.\n\n#### Common shortcuts:\n\n- `Ctrl+M` switches between Traversal Mode and Insert Tab Character Mode in the code editor\n\n- `Ctrl+Space` for code completion (content assist) in the editor\n\n- `Shift+F1` shows a tooltip (if available) for the current caret position or focused control, which can be closed with `Esc`\n\n- `Shift+F10` opens a context menu\n\n- `Ctrl++` zoom in, `Ctrl+-` zoom out, `Ctrl+0` reset",
	"Themes": "Themes",
	"themeInfo.md": "Font size can be changed in the [Editor Theme settings](${0}), and theme colors can be changed in the Editor or [IDE Theme settings](${1}).",
	"ScreenReaders": "Screen Readers",
	"srInfo.md": "When editing code, set your screen reader to say all punctuation.",
	"Documentation": "Documentation",
	"docInfo.md": "For more information on accessibility, see our [Accessibility documentation](${0}).",
	"Enable": "Enable",
	"Enabled":"Enabled ${0}",
	"EnableTooltip": "Enable the plug-in",
	"Reload all": "Reload all",
	"ReloadAllPlugs": "Reload all installed plug-ins",
	"CreatePlug": "Create a new Orion Plug-in",
	"FindMorePlugs": "Find More Orion Plug-ins",
	"Get Plugins": "Get Plug-ins",
	"Reload": "Reload",
	"ReloadPlug": "Reload the plug-in",
	"ReloadingPlugin": "Realoading plug-in",
	"ReloadingAllPlugins": "Realoading all plug-ins",
	"Delete": "Delete",
	"DeletePlugFromConfig": "Delete this plug-in from the configuration",
	"DeleteUser": "Delete User Profile as well as workspaces and projects",
	"DeleteUserComfirmation": "WARNING: This will permanently delete your user profile and all workspaces, including all the data contained therein. \n\nThis process is not revesable.",
	"TypePlugURL": "Type a plug-in url here ...",
	"Already installed": "Already installed",
	"Installed":"Installed ${0}",
	"Installing":"Installing ${0}...",
	"Uninstalled":"Uninstalled ${0}",
	"UninstallCfrm":"Are you sure you want to uninstall '${0}'?",
	"ReloadedPlug":"Reloaded ${0} plug-in.",
	"ReloadedNPlugs":"Reloaded ${0} plug-ins.",
	"Reloaded":"Reloaded ${0}",
	"Services": "Services",
	"Previous Service": "Previous Service",
	"Next Service": "Next Service",
	"Value": "Value",
	"JavaScript Object": "JavaScript Object",
	"CheckJsConsoleDrillDown": "click here, then check javascript console to drill down",
	"Item": "Item",
	"Git Config": "Git Config",
	"GitWorkDir": "Git Working Directory",
	"GitRepoDir": "Git Repository Directories",
	"GitRepoSearchDirs": "Search directories (comma-separated list):",
	"GitRepoSearchDirsTooltip": "Specify the directories to search for git repositories. By default the whole workspace is searched.",
	"SelectUnstagedChanges": "Always select changed files",
	"Clear Git Credentials": "Clear Git Credentials",
	"Enable Storage": "Enable Storage:",
	"BrowserCredStoreMsg": "Please be aware that your credentials will be stored persistently in the browser.",
	"AskEnableKeyStorage": "Do you wish to enable the Key Storage?",
	"general": "General",
	"validation": "Validation",
	"DeletedGitMsg": "Deleted git credentials for ${0}",
	"Editor": "Editor Settings",
	"editorSettings": "Editor Settings",
	"EditorThemes": "Editor Themes",
	"IDEThemes": "IDE Theme",
	"defaultImportedThemeName": "New Theme",
	"nameImportedTheme": "Please enter a name for this new theme:",
	"importThemeButton": "Select a file to import",
	"dndTheme": "...or drag and drop a theme file here...",
	"textTheme": "...or paste themes here",
	"Import": "Import",
	"Import a theme": "Import a theme",
	"Paste Theme:": "Paste Theme:",
	"Drop Theme File:": "Drop Theme File:",
	"ImportThemeDialogMessage": "Import a previously-exported Orion theme. For information on importing a theme from Sublime Text, Brackets or Eclipse, please see <a href='https://wiki.eclipse.org/Orion/How_Tos/Import_Theme' target='_blank'>Import Theme</a>.",
	"ImportThemeError": "The imported content is not a valid theme definition.",
	"Export": "Export",
	"Export a theme": "Export a theme",
	"Theme name:": "Theme name:",
	"yourTheme": "yourTheme",
	"fileManagement": "File Management",
	"typing": "Typing",
	"autoSave": "Auto Save:",
	"autoSaveTimeout": "Save interval (ms):",
	"autoLoad": "Auto Load:",
	"saveDiffs": "Save file as diffs:",
	"trimTrailingWhiteSpace": "Trim Trailing Whitespace on Save:",
	"formatOnSave": "Format code on save",
	"Restore": "Restore Defaults",
	"Default": "Default",
	"keys": "Keys",
	"tabs": "Tabs",
	"tabSize": "Tab Size:",
	"expandTab": "Insert spaces for tabs:",
	"smoothScrolling": "Smooth Scrolling",
	"scrollAnimation": "Scrolling Animation:",
	"scrollAnimationTimeout": "Scrolling Duration (ms):",
	"showAnnotations": "Annotations",
	"showCurrentSearchAnnotation": "Current Search",
	"showMatchingSearchAnnotation": "Matching Search",
	"showReadOccurrenceAnnotation": "Read Occurrence",
	"showWriteOcurrenceAnnotation": "Write Occurrence",
	"showCurrentBlameAnnotation": "Current Blame",
	"showBlameAnnotation": "Blame",
	"showErrorAnnotation": "Error",
	"showWarningAnnotation": "Warning",
	"showInfoAnnotation": "Info",
	"showTaskAnnotation": "Task",
	"showBookmarkAnnotation": "Bookmark",
	"showMatchingBracketAnnotation": "Matching Bracket",
	"showCurrentBracketAnnotation": "Current Bracket",
	"showCurrentLineAnnotation": "Current Line",
	"showOverviewAnnotations": "Overview Annotations",
	"showOverviewCurrentSearchAnnotation": "Current Search",
	"showOverviewMatchingSearchAnnotation": "Matching Search",
	"showOverviewReadOccurrenceAnnotation": "Read Occurrence",
	"showOverviewWriteOcurrenceAnnotation": "Write Occurrence",
	"showOverviewCurrentBlameAnnotation": "Current Blame",
	"showOverviewBlameAnnotation": "Blame",
	"showOverviewErrorAnnotation": "Error",
	"showOverviewWarningAnnotation": "Warning",
	"showOverviewInfoAnnotation": "Info",
	"showOverviewTaskAnnotation": "Task",
	"showOverviewBookmarkAnnotation": "Bookmark",
	"showOverviewMatchingBracketAnnotation": "Matching Bracket",
	"showOverviewCurrentBracketAnnotation": "Current Bracket",
	"showOverviewCurrentLineAnnotation": "Current Line",
	"showTextAnnotations": "Text Annotations",
	"showTextCurrentSearchAnnotation": "Current Search",
	"showTextMatchingSearchAnnotation": "Matching Search",
	"showTextReadOccurrenceAnnotation": "Read Occurrence",
	"showTextWriteOcurrenceAnnotation": "Write Occurrence",
	"showTextCurrentBlameAnnotation": "Current Blame",
	"showTextBlameAnnotation": "Blame",
	"showTextErrorAnnotation": "Error",
	"showTextWarningAnnotation": "Warning",
	"showTextInfoAnnotation": "Info",
	"showTextTaskAnnotation": "Task",
	"showTextBookmarkAnnotation": "Bookmark",
	"showTextMatchingBracketAnnotation": "Matching Bracket",
	"showTextCurrentBracketAnnotation": "Current Bracket",
	"showTextCurrentLineAnnotation": "Current Line",
	"keyBindings": "Key Bindings:",
	"rulers": "Rulers",
	"annotationRuler": "Show Annotation Ruler:",
	"lineNumberRuler": "Show Line Number Ruler:",
	"foldingRuler": "Show Folding Ruler:",
	"overviewRuler": "Show Overview Ruler:",
	"zoomRuler": "Show Code Map Ruler:",
	"whitespaces": "White Spaces",
	"wrapping": "Wrapping",
	"wordWrap": "Word Wrap:",
	"showMargin": "Show Margin:",
	"marginOffset": "Margin Column:",
	"showWhitespaces": "Show Whitespace Characters:",
	"autoSaveTimeoutInvalid": "Invalid save interval.",
	"scrollAnimationTimeoutInvalid": "Invalid scrolling duration.",
	"tabSizeInvalid": "Invalid tab size.",
	"localSettings": "${0} Local Settings",
	"localSettingsButton": "Local Settings toggle button",
	"localSettingsTooltip": "Toggle whether this setting is shown in the local editor settings drop down.",
	"editorSettingsInfo": "Use the ${0} to show a setting in the local editor settings drop down. ${1}",
	"autoPairParentheses": "Autopair (Parentheses):",
	"autoPairBraces": "Autopair {Braces}:",
	"autoPairSquareBrackets": "Autopair [Square] Brackets:",
	"autoPairAngleBrackets": "Autopair <Angle> Brackets:",
	"autoPairQuotations": 'Autopair "Strings":',
	"autoCompleteComments": "Autocomplete /** Block Comments */:",
	"smartIndentation": "Smart Indentation:",
	"sourceControl": "Source Control",
	"showBlame": "Show Blame",
	"languageTools": "Language Tools",
	"showOccurrences": "Show Occurrences:",
	"contentAssistAutoTrigger": "Show Content Assist automatically:",
	"Editor preferences updated": "Editor preferences updated",
	"Editor defaults restored": "Editor defaults restored",
	"Font Size": "Font Size:",
	"New Theme Name:": "New Theme Name:",
	"Font Size:": "Font Size:",
	"Navigation Bar": "Navigation Bar",
	"Navigation Text": "Navigation Text",
	"Search Box": "Search Box",
	"Tool Panel": "Tool Panel",
	"Selection Bar": "Selection Bar",
	"Location": "Location",
	"Content": "Content",
	"Main Panel": "Main Panel",
	"Button": "Button",
	"Button Text": "Button Text",
	"Section Text": "Section Text",
	"Side Panel": "Side Panel",
	"Line Color": "Line Color",
	"Parameters": "Parameters",
	"Foreground": "Foreground",
	"Tags": "Tags",
	"Annotation Ruler": "Annotation Ruler",
	"Show Guide": "Show Guide",
	"Check Guide": "Check Guide",
	"Cancel": "Cancel",
	"Save Theme": "Save Theme",
	"Delete Theme": "Delete Theme",
	"Revert Theme": "Revert Theme",
	"Update Theme": "Update Theme",
	"clickDiagram": "Select a theme, or click elements in the diagram to style them individually.",
	"Property Names": "Property Names",
	"HexNumber": "Numbers (Hex)",
	"DecimalNumbers": "Numbers (Decimal)",
	"CSS Text": "CSS Text",
	"COLOR:": "Color:",
	"NEW COLOR:": "New Color:",
	"Ok": "Ok",
	"OR HEX:": "Or Hex: ",
	"pluginStatusNotLoaded": "This plug-in is not loaded.",
	"pluginStatusNotRunning": "This plug-in is disabled.",
	"pluginStatusBroken": "This plug-in could not be loaded.",
	"Website": "Website",
	"License": "License",
	"Login": "Login",
	'clearThemeAndEditorSettings.name': 'Clear themes and editor settings',
	'clearThemeAndEditorSettings.tooltip': 'Clear all settings associated with editor themes and window themes',
	"Settings": "Settings",
    "SettingUpdateSuccess": "${0} settings successfully updated.",
    "buttonSave": "Save",
    "buttonRevert": " Revert",
    "ConfirmRestore": "Restore these settings to their default values?",
    "Theme: ": "Theme: ",
    "Display Language: ": "Display Language: ",
    "cannotDeleteMsg": " is a default theme that cannot be deleted",
    "confirmDeleteMsg": "Are you sure you want to delete this theme?",
    "cannotModifyMsg": "${0} is a default theme that cannot be modified. Please use another name.",
    "settingsRestored": "Settings restored.",
    "editorTheme font size": "Font size",
    "editorTheme font color": "Font color",
    "editorTheme background": "Background",
    "editorTheme ruler background": "Ruler background",
    "editorTheme ruler color": "Ruler color",
    "editorTheme ruler border color": "Ruler border color",
    "editorTheme current line background": "Current line background",
	"editorTheme highlighted line background": "Highlighted line background",
    "editorTheme comment": "Comment",
    "editorTheme language variable": "Language variable",
    "editorTheme language constant": "Language constant",
    "editorTheme number": "Number",
    "editorTheme string": "String",
    "editorTheme entity": "Entity and function name",
    "editorTheme keyword (control)": "Keyword (control)",
    "editorTheme keyword (operator)": "Keyword (operator)",
    "editorTheme function parameter": "Function parameter",
    "editorTheme comparison and logical operators": "Comparison and logical operators",
    "editorTheme write occurrence background": "Write occurrence background",
    "editorTheme matching bracket background": "Matching bracket background",
    "editorTheme matching search background": "Matching search background",
    "editorTheme current search background": "Current search background",
    "editorTheme search range background": "Search range background",
    "editorTheme documentation task color": "Documentation task color",
    "editorTheme property name color": "Property name color",
    "editorTheme tag": "Tag",
    "editorTheme keyword directive color": "Directive",
    "editorTheme tag attribute": "Tag attribute",
    "editorTheme doc annotation attribute": "Documentation annotation color",
    "editorTheme doc tag attribute": "Documentation tag color",
    "editorTheme selection background": "Selection background",
    "editorTheme warning color": "Warning underline color",
    "editorTheme info color": "Info underline color",
    "editorTheme error color": "Error underline color",
    "editorTheme lines annotation diffAdded": "Diff Added ruler color",
    "editorTheme lines annotation diffModified": "Diff Modified ruler color",
    "editorTheme lines annotation diffDeleted": "Diff Deleted ruler color",
    "editorTheme annotation blame": "Blame ruler color",
    "editorTheme annotation currentBlame": "Current blame ruler color",
    "editorTheme dark searchmatch box": "Matching search box color",
    "containerTheme primary background": "Primary background color",
    "containerTheme primary text": "Primary text color",
    "containerTheme secondary background": "Secondary background color",
    "containerTheme secondary text": "Secondary text color",
    "containerTheme tertiary background": "Tertiary background color",
    "containerTheme tertiary text": "Tertiary Text Color",
    "containerTheme flavor color": "Flavor color",
    "Theme Preview": "Theme Preview",
	"Sidebar": "Sidebar",
	"EditorPage": "Editor",
	"Shell": "Shell",
	"Sites": "Sites",
	"File": "File",
	"Edit": "Edit",
	"View": "View",
	"Tools": "Tools",
	"Create new launch configuration": "Create new launch configuration",
	"Deploy": "Deploy",
	"Stop": "Stop",
	"Open App": "Open App",
	"Logs": "Logs",
	"Operations": "Operations",
	"Single Page": "Single Page",
	"Help": "Help",
	"Orion Content (localhost)": "Orion Content (localhost)",
	"Choose Filesystem": "Filesystem",
	"Navigator": "Navigator",
    'customizeTheme': 'Custom Theme...',
    'moreEditorSettings': 'Editor Settings...',
    'SettingWarning' : '${0} Warning: Global settings for \'${2}\' are overriden by the settings defined in: ${1}',
    "version": "Version ${0}",
});

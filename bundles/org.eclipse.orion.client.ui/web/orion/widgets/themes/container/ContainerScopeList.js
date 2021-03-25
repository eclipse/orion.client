/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Casey Flynn - Google Inc - initial API and implementation
 ******************************************************************************/
 /*eslint-env browser,amd*/
define(['i18n!orion/settings/nls/messages'
], function (messages) {
	var defaultColor = "#ff80c0";
	return [
	{
		display: messages["containerTheme primary background"],
		objPath: [
				"styles #configSection background-color",
				"styles .checkedRow .commandButton border-color",
				"styles .checkedRow .commandButton:not(.primaryButton):focus background",
				"styles .checkedRow .commandButton:not(.primaryButton):hover background",
				"styles .fixedToolbarHolder background",
				"styles .mainToolbar background-color",
				"styles .mainToolbar .commandButton.orionButton.dropdownTrigger border-color",
				"styles .sideMenu background-color",
				"styles .textviewTooltip .commandButton border-color",
				"styles .focusedEditorTab background-color",
			],
			id: "primaryBackgroundColor",
			value: defaultColor
		}, {
			display: messages["containerTheme primary text"],
			objPath: [
				"styles .commandImage.dropdownTrigger color",
				"styles .dropdownButtonWithIcon color", 
				"styles .dropdownTrigger:not(.dropdownDefaultButton) color",
				"styles .editorViewerHeader color",
				"styles .filesystemName color",
				"styles .mainToolbar color",
				"styles .mainToolbar .commandImage.dropdownTrigger color",
				"styles .sectionTable .preview_td color",
				"styles .sideMenuItem color",
				"styles .focusedEditorTab color",
			],
			id: "primaryTextColor",
			value: defaultColor
		}, {
			display: messages["containerTheme secondary background"],
			objPath: [
				"styles .editorViewerHeader background",
				"styles .launchConfigurationMenuItem.dropdownMenuItemActive background",
				"styles .sectionTable .preview_td border-bottom",
				"styles .sidebarWrapper background",
				"styles .splash background",
				"styles .splashLoader background",
				"styles .statusContainer background",
				"styles .titleActionContainer background",
				"styles .dropdownMenuItem color",
			], 
			id: "secondaryBackgroundColor", 
			value: defaultColor
		}, {
			display: messages["containerTheme secondary text"],
			objPath: [
				"styles .checkedRow color",
				"styles .checkedRow .commandButton color",
				"styles .checkedRow gitStatusIcon color",
				"styles .checkedRow gitStatusTitle color",
				"styles .checkedRow>td>span>a color",
				"styles .dialogTitle color",
				"styles .label.parameterInput color",
				"styles .launchConfigurationsButton .commandButton.orionButton.dropdownTrigger color",
				"styles .launchConfigurationsWrapper>.launchConfigurationsButton.dropdownTrigger color",
				"styles .launchConfsDropdown .dropdownDefaultButton color",
				"styles .launchConfsLabel color",
				"styles .mainToolbar .commandButton.orionButton.dropdownTrigger .dropdownTriggerButtonLabel color",
				"styles .mainToolbar .commandButton.orionButton.dropdownTrigger.launchConfigurationsButton .dropdownArrowDown color",
				"styles .mainToolbar .gitSectionLabel color",
				"styles .mainToolbar .sectionWrapper color",
				"styles .navbar-item-selected color",
				"styles .orionSwitchLabel color",
				"styles .outlineExplorer .treeIterationCursorRow_Dotted color",
				"styles .primaryButton color",
				"styles .sideMenuItemActive color",
				"styles .sideMenuItemActive:hover color",
				"styles .slideParameters color",
				"styles .textviewTooltip color",
				"styles .tooltip color",
				"styles .tooltip h2 color",
				"styles .tooltip .navlinkonpage color",
				"styles .tooltip .operationError color",
				"styles .editorTabCloseButton:hover color"
			], 
			id: "secondaryTextColor",
			value: defaultColor
		}, {
			display: messages["containerTheme tertiary background"],
			objPath: [
				"styles .auxpane background",
				"styles .content-fixedHeight background",
				"styles .mainpane background",
				"styles .split background",
				"styles .splitThumb background",
				"styles .pageToolbar .dropdownTrigger:not(.dropdownDefaultButton) color",
				"styles .editorTabCloseButton:hover background-color",
				"styles .editorTab border-top",
				"styles .editorTab border-right",
				"styles .textviewTooltip .commandButton:not(.primaryButton):hover background-color", //.25 opcacity
				"styles .textviewTooltip .commandButton:not(.primaryButton):focus background-color", //.25 opcacity
				"styles .gitCommitListSection .commandButton.orionButton.dropdownTrigger:hover background-color" //.25 opcacity
			],
			id: "tertiaryBackgroundColor",
			value: defaultColor
		}, {
			display: messages["containerTheme tertiary text"],
			objPath: [
				"styles #configSection color",
				"styles .checkedRow .commandButton:not(.primaryButton):focus color",
				"styles .checkedRow .commandButton:not(.primaryButton):hover color",
				"styles .commandButton:not(.primaryButton):focus color",
				"styles .commandButton:not(.primaryButton):hover color",
				"styles .mainToolbar .commandButton.orionButton.dropdownTrigger color",
				"styles .projectNavColumn color",
				"styles .sidebarWrapper color",
				"styles .splashDetailedMessage color",
				"styles .splashMessage color",
				"styles .status color",
				"styles .statusContainer color",
				"styles .titleActionContainer color",
			],
			id: "tertiaryTextColor",
			value: defaultColor
		}, {
			display: messages["containerTheme flavor color"],
			objPath: [
				"styles .checkedRow background-color",
				"styles .checkedRow .commandButton:not(.primaryButton):focus background",
				"styles .checkedRow .commandButton:not(.primaryButton):hover background",
				"styles .checkedRow .commandButton:not(.primaryButton):focus box-shadow",
				"styles .checkedRow .commandButton:not(.primaryButton):hover box-shadow",
				"styles .commandButton border-color",
				"styles .commandButton color",
				"styles .commandButton:not(.primaryButton):focus background-color", //.25 opcacity
				"styles .commandButton:not(.primaryButton):focus box-shadow",
				"styles .commandButton:not(.primaryButton):hover box-shadow",
				"styles .commandButton:not(.primaryButton):hover background-color", //.25 opcacity
				"styles .dialogTitle background-color",
				"styles .dropdownMenu .dropdownMenuItemSelected background", //.25 opcacity
				"styles .dropdownMenu .dropdownMenuItemSelected border-left-color",
				"styles .gitCommitMessage .gitCommitMessageTopRow border-color",
				"styles .gitCommitMessageSection background-color", //.25 opcacity
				"styles .gitCommitMore color",
				"styles .gitStatusIcon color",
				"styles .gitStatusSection background-color", //.25 opcacity
				"styles .gitStatusTitle color",
				"styles .launchConfigurationsWrapper>.launchConfigurationsButton.dropdownTrigger background-color",
				"styles .launchConfsDropdown .dropdownDefaultButton background-color",
				"styles .launchConfsLabel background-color",
				"styles .liveUpdateLabel color",
				"styles .mainToolbar .gitSectionLabel background-color",
				"styles .mainToolbar .sectionWrapper background-color",
				"styles .navbar-item-selected background-color",
				"styles .orionSwitchLabel background-color",
				"styles .outlineExplorer .treeIterationCursorRow_Dotted background-color",
				"styles .primaryButton background-color",
				"styles .primaryButton border-color",
				"styles .primaryButton:hover .primaryButton:focus background",
				"styles .primaryButton:hover .primaryButton:focus border-color",
				"styles .searchResultsWrapperDiv .selectableNavRow:hover background", //.25 opcacity
				"styles .searchResultsWrapperDiv .selectableNavRow:hover border-left-color",
				"styles .sideMenuItem>.submenu-trigger:hover color",
				"styles .sideMenuItemActive background-color",
				"styles .sideMenuItemActive:hover background",
				"styles .slideParameters background-color",
				"styles .splashAbout color",
				"styles .splashVerbal color",
				"styles .tooltip background-color",
				"styles .tooltip border-color",
				"styles .tooltip .navlinkonpage background-color",
				"styles .tooltipTailFromabove:after border-top-color",
				"styles .tooltipTailFromabove:before border-top-color",
				"styles .tooltipTailFrombelow:after border-bottom-color",
				"styles .tooltipTailFrombelow:before border-bottom-color",
				"styles .tooltipTailFromleft:after border-left-color",
				"styles .tooltipTailFromleft:before border-left-color",
				"styles .tooltipTailFromright:after border-right-color",
				"styles .tooltipTailFromright:before border-right-color",
				"styles .treeIterationCursorRow background-color",
				"styles .treeIterationCursorRow_Dotted background-color",
				"styles .treeTableRow span.core-sprite-closedarrow:hover color",
				"styles .treeTableRow span.core-sprite-openarrow:hover color",
				"styles .desktopmode .selectableNavRow:hover background-color", //.25 opcacity
				"styles .editorTabCloseButton:hover background-color",
				"styles .contentassist .selected background-color",
				"styles .textviewTooltip background-color"
			],
			id: "flavorColor",
			value: defaultColor
		}
	];
});

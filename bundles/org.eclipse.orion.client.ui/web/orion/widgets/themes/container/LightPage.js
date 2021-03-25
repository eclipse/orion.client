/*******************************************************************************
 * @license
 * Copyright (c) 2015-2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Casey Flynn - Google Inc - initial API and implementation
 ******************************************************************************/
 /*eslint-env browser,amd*/
define({
	"className": "lightPage",
	"name": "Light",
	"styles": {
		"#configSection": {
			"background-color": "#FFFFFF !important",
			"color": "#000000 !important"
		},
		"#log": {
			"margin": "5px",
			"width": "calc(100% - 17px)"
		},
		".auxpane": {
			"background": "#C4C5C8 !important"
		},
		".desktopmode": {
			".selectableNavRow:hover": {
				"background-color": "rgba(60, 113, 179, 0.25)"
			}
		},
		".checkedRow": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important",
			".commandButton": {
				"border-color": "#FFFFFF",
				"color": "#FFFFFF"
			},
			".commandButton:not(.primaryButton):not([disabled]):hover": {
				"background": "rgba(60, 113, 179, 0.50)",
				"box-shadow": "0 1px 2px 0 rgb(60, 113, 179)",
				"color": "#000000"
			},
			".gitStatusIcon": {
				"color": "white !important"
			},
			".gitStatusTitle": {
				"color": "white !important"
			},
			"gitStatusIcon": {
				"color": "#FFFFFF"
			},
			"gitStatusTitle": {
				"color": "#FFFFFF"
			}
		},
		".checkedRow>td>span>a":{
			"color": "#FFFFFF !important"
		},
		".commandButton": {
			"background-color": "rgba(0, 0, 0, 0)",
			"border-width": "1px",
			"border-style": "solid",
			"border-color": "#3C71B3",
			"color": "#376FB2"
		},
		".commandButton.disabled": {
			"color": "#cdcdcd",
			"border-color": "#cdcdcd"
		},
		".commandButton.orionButton.dropdownTrigger:hover": {
			"border-color": "#ccc"
		},
		".gitCommitListSection": {
			".commandButton.orionButton.dropdownTrigger:hover": {
				"background-color": "rgba(196, 197, 200, 0.25)",
			}
		},
		".commandButton:not(.primaryButton):not([disabled]):hover": {
			"background-color": "rgba(60, 113, 179, 0.25)",
			"box-shadow": "0 1px 2px 0 rgb(60, 113, 179)",
			"color": "#000000"
		},
		".content-fixedHeight": {
			"background": "#C4C5C8 !important"
		},
		".core-sprite-error": {
			"color": "red"
		},
		".dialogTitle": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".dropdownButtonWithIcon": {
			"color": "#152935 !important"
		},
		".dropdownCommandName": {
			"color": "#000000 !important"
		},
		".dropdownArrowRight" : {
			"color": "#000000 !important"
		},
		".dropdownMenu": {
			".dropdownMenuItemSelected": {
				"background": "rgba(60, 113, 179, 0.25)",
				"border-left-color": "#3C71B3"
			}
		},
		".dropdownTrigger:not(.dropdownDefaultButton)": {
			"color": "#152935 !important"
		},
		".dropdownSelection.dropdownTriggerOpen": {
			"background-color": "#CEDBEC !important"
		},
		".editorViewerHeader": {
			"background": "#F5F7FA !important",
			"color": "#152935 !important"
		},
		".filesystemName": {
			"color": "#152935 !important"
		},
		".fixedToolbarHolder": {
			"background": "#FFFFFF"
		},
		".gitCommitMessage": {
			".gitCommitMessageTopRow": {
				"border-color": "#3C71B3"
			},
			".gitCommitMore":{
				"color": "#004A60 !important"
			}
		},
		".gitCommitMessageSection": {
			"background-color": "rgba(60, 113, 179, 0.25)"
		},
		".gitCommitMore": {
			"color": "#005F88 !important"
		},
		".gitStatusIcon": {
			"color": "#3C71B3 !important"
		},
		".gitStatusSection": {
			"background-color": "rgba(60, 113, 179, 0.25)"
		},
		".gitStatusTitle": {
			"color": "#035899 !important"
		},
		".label.parameterInput": {
			"color": "#FFFFFF !important"
		},
		".launchConfigurationMenuItem.dropdownMenuItemActive": {
			"background": "#F5F7FA"
		},
		".launchConfigurationsButton": {
			".commandButton.orionButton.dropdownTrigger": {
				"color": "#FFFFFF !important"
			}
		},
		".launchConfigurationsWrapper>.launchConfigurationsButton.dropdownTrigger": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".launchConfsDropdown": {
			".dropdownDefaultButton": {
				"background-color": "#3C71B3 !important",
				"color": "#FFFFFF !important"
			}
		},
		".launchConfsLabel": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".liveUpdateLabel": {
			"color": "#3C71B3 !important"
		},
		".mainToolbar": {
			"background-color": "#FFFFFF",
			"color": "#152935 !important",
			".commandButton.orionButton.dropdownTrigger": {
				"border-color": "#FFFFFF",
				"color": "#000000 !important",
				".dropdownTriggerButtonLabel": {
					"color": "#FFFFFF"
				}
			},
			".commandButton.orionButton.dropdownTrigger.dropdownTriggerOpen": {
				"color": "#000000 !important"
			},
			".commandButton.orionButton.dropdownTrigger.launchConfigurationsButton": {
				".dropdownArrowDown": {
					"color": "#FFFFFF"
				}
			},
			".commandImage.dropdownTrigger": {
				"color": "rgb(21, 41, 53) !important"
			},
			".gitSectionLabel": {
				"background-color": "#3C71B3 !important",
				"color": "#FFFFFF !important"
			},
			".sectionWrapper": {
				"background-color": "#3C71B3 !important",
				"color": "#FFFFFF !important"
			}
		},
		".mainpane": {
			"background": "#C4C5C8 !important"
		},
		".navbar-item-selected": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".orionSwitchLabel": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".outlineExplorer": {
			".treeIterationCursorRow_Dotted": {
				"background-color": "#3C71B3 !important",
				"color": "#FFFFFF !important"
			}
		},
		".primaryButton": {
			"background-color": "#3C71B3 !important",
			"border-width": "1px",
			"border-style": "solid",
			"border-color": "#3C71B3 !important",
			"border-radius": "0 !important",
			"color": "#FFFFFF !important"
		},
		".primaryButton.disabled": {
			"background-color": "rgba(60, 113, 179, 0.25) !important",
			"border-color": "white !important"
		},
		".projectNavColumn": {
			"color": "#000000"
		},
		".searchResultsWrapperDiv": {
			".selectableNavRow:hover": {
				"background": "rgba(60, 113, 179, 0.25)",
				"border-left-color": "#3C71B3"
			}
		},
		".sectionTable": {
			"background-color": "#FFFFFF",
			".preview_td": {
				"border-bottom": "1px solid #F5F7FA",
				"color": "#152935"
			}
		},
		".sideMenu": {
			"background-color": "#FFFFFF"
		},
		".sideMenuItem": {
			"color": "#152935 !important"
		},
		".sideMenuItem>.submenu-trigger:hover": {
			"color": "#3C71B3 !important"
		},
		".sideMenuItemActive": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".sideMenuItemActive:hover": {
			"background": "rgba(60, 113, 179, 0.25) !important",
			"color": "#FFFFFF"
		},
		".sidebarWrapper": {
			"background": "#F5F7FA !important",
			"color": "#000000"
		},
		".slideParameters": {
			"background-color": "#3C71B3 !important",
			"color": "#FFFFFF !important"
		},
		".splash": {
			"background": "#F5F7FA !important",
			"box-shadow": "none"
		},
		".splashAbout": {
			"color": "#3C71B3 !important"
		},
		".splashDetailedMessage": {
			"color": "#000000"
		},
		".splashLoader": {
			"background": "#F5F7FA !important",
			"box-shadow": "none"
		},
		".splashLoadingImage": {
			"-webkit-animation": "rotateThis .5s infinite linear",
			"animation": "rotateThis .5s infinite linear",
			"background": "none",
			"border": "2px solid #00b299",
			"border-radius": "50%",
			"border-right-color": "transparent",
			"display": "inline-block",
			"height": "20px",
			"margin": "0",
			"opacity": ".4",
			"width": "20px"
		},
		".splashLoadingImage.initial": {
			"border-width": "4px",
			"height": "40px",
			"width": "40px"
		},
		".splashMessage": {
			"color": "#000000"
		},
		".splashVerbal": {
			"color": "#3C71B3 !important"
		},
		".split": {
			"background": "#C4C5C8"
		},
		".split:focus": {
			"background": "rgb(60, 113, 179)"
		},
		".splitThumb": {
			"background": "#C4C5C8"
		},
		".status": {
			"color": "#000000"
		},
		".statusContainer": {
			"background": "#F5F7FA",
			"color": "#000000"
		},
		".statusLight": {
			"background": "lightgray"
		},
		".statusLight.statusLightAmber": {
			"background": "#FFE141"
		},
		".statusLight.statusLightGreen": {
			"background": "#13dd6d"
		},
		".statusLight.statusLightProgress": {
			"background": "transparent",
			"border-color": "transparent lightgray lightgray lightgray",
		},
		".statusLight.statusLightRed": {
			"background": "#C1272D"
		},
		".textviewTooltip": {
			".commandButton": {
				"background-color": "inherit",
				"border": "1px solid #325C80",
				"border-color": "#FFFFFF",
				"color": "white",
				"margin-bottom": "2px"
			},
			"color": "#FFFFFF",
			"background-color": "rgb(60, 113, 179)",
			".commandButton:not(.primaryButton):focus":{
				"color": "white",
   				"background-color": "rgba(196, 197, 200, 0.25)"
			},
			".commandButton:not(.primaryButton):not([disabled]):hover":{
				"color": "white",
   				"background-color": "rgba(196, 197, 200, 0.25)"
			}
		},
		".titleActionContainer": {
			"background": "#F5F7FA !important",
			"color": "#000000"
		},
		".tooltip": {
			"background-color": "#3C71B3 !important",
			"border-width": "1px",
			"border-style": "solid",
			"border-color": "#3C71B3",
			"color": "#FFFFFF !important",
			"h2": {
				"color": "#FFFFFF !important"
			},
			".navlinkonpage": {
				"background-color": "#3C71B3 !important",
				"color": "#FFFFFF !important"
			},
			".operationError": {
				"color": "#FFFFFF !important"
			}
		},
		".tooltipTailFromabove:after": {
			"border-top-color": "#3C71B3"
		},
		".tooltipTailFromabove:before": {
			"border-top-color": "#3C71B3"
		},
		".tooltipTailFrombelow:after": {
			"border-bottom-color": "#3C71B3"
		},
		".tooltipTailFrombelow:before": {
			"border-bottom-color": "#3C71B3"
		},
		".tooltipTailFromleft:after": {
			"border-left-color": "#3C71B3"
		},
		".tooltipTailFromleft:before": {
			"border-left-color": "#3C71B3"
		},
		".tooltipTailFromright:after": {
			"border-right-color": "#3C71B3"
		},
		".tooltipTailFromright:before": {
			"border-right-color": "#3C71B3"
		},
		".treeIterationCursorRow": {
			"background-color": "rgba(60, 113, 179, 0.25)"
		},
		".treeIterationCursorRow_Dotted": {
			"background-color": "rgba(60, 113, 179, 0.25)"
		},
		".treeTableRow": {
			"span.core-sprite-closedarrow:hover" : {
				"color": "#3C71B3"
			},
			"span.core-sprite-openarrow:hover" : {
				"color": "#3C71B3"
			}
		},
		".treeTableRow.checkedRow.gitCommitListSection": {
			"span.core-sprite-closedarrow:hover" : {
				"color": "lightgray",
			},
			"span.core-sprite-openarrow:hover" : {
				"color": "lightgray",
			}
		},
		".workingTarget": {
			"background-color": "#FFFFFF"
		},
		".commandImage.dropdownTrigger": {
			"color": "#152935"
		},
		".dropdownMenuItem": {
			"color": "#F5F7FA"
		},
		".pageToolbar": {
			".dropdownTrigger:not(.dropdownDefaultButton)": {
				"color": "#C4C5C8"
			}
		},
		".editorTabCloseButton:hover": {
			"background-color": "rgba(60, 113, 179, 1)",
			"color": "#FFFFFF"
		},
		".editorTab": {
			"border-top": "1px solid #C4C5C8",
			"border-right": "1px solid #C4C5C8"
		},
		".focusedEditorTab": {
			"border-top": "2px solid #3C71B3",
			"background-color": "#FFFFFF",
			"color": "#152935"
		},
		".contentassist .selected": {
			"background-color": "#3C71B3",
			"background": "#3C71B3"
		},
		".progressWatch.running": {
			".watchButton": {
				"border-color": "black"
			},
			".watchBody": {
				"border-color": "black"
			},
			".watchBody .hand.longHour > .darkSide": {
				"background-color": "black",
			},
			".watchBody .hand.longMinute > .darkSide": {
				"background-color": "black",
			}
		}
	}
});

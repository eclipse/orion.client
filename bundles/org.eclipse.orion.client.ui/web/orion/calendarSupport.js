/*******************************************************************************
 * Copyright (c) 2016, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define ([
	'orion/widgets/settings/GlobalizationSettings',
	'orion/util'
],function(GlobalizationSettings, util){ /* ACGC */

	var calendarTypeStorage = "/orion/preferences/bidi/calendarType"; //$NON-NLS-0$	

	var calendarType = getCalendarType();
	var calendarLocale = getCalendarLocale();

	/**
	 * returns calendarType value set in globalization settings.
	 * @returns {String} calendar type.
	 */	
	function getCalendarType() {
		var calendarType = util.readSetting(calendarTypeStorage);
		if (calendarType) {	
			return calendarType;
		}
		else {
			return 'gregorian';	//$NON-NLS-0$
		}
	}
	
	/**
	 * returns calendarLocale value based on calendar type.
	 * @returns {String} calendar locale.
	 */	
	function getCalendarLocale() {
		var calendarLocale = 'null'; //$NON-NLS-0$
		if (calendarType == 'islamic') {	//$NON-NLS-0$
			calendarLocale = 'ar-EG-u-ca-islamic'; //$NON-NLS-0$
			return calendarLocale;
		}
		else if (calendarType == 'hebrew'){ //$NON-NLS-0$
			calendarLocale = 'he-u-ca-hebrew'; //$NON-NLS-0$
			return calendarLocale;
		}
		else { //return default locale
			return calendarLocale; 
		}
	}	

	return {
		calendarLocale : calendarLocale
	};

	
});

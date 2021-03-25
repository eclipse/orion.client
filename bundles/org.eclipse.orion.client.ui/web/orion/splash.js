/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env amd, browser*/
define([
	'module', 
	'i18n!orion/nls/messages', 
	'orion/i18nUtil', 
	'orion/banner/banner', 
	'orion/webui/littlelib',
	'orion/util'
], function(module, messages, i18nUtil, Banner, lib, util) {
	
var pageLoader;

function step(id, description, type, total) {
	
	this.TYPE_FILLER = 0;
	this.TYPE_DRIVEN = 1;
	this.type = type;

	this.id = id;
	this.description = description;
	this.total = total;
	this.worked = 0;

	this.WAITING = 0;
	this.HAPPENING = 1;
	this.COMPLETED = 2;
	this.state = this.WAITING;

	this.template = "";
	this.domNode;
}

function mark(name) {
	if (window.performance && window.performance.mark) {
		window.performance.mark("orion-" + name);
	}
}

step.prototype.complete = function() {
	mark("end splash step " + this.id);
	this.state = this.COMPLETED;
	if (this.domNode) {
		this.domNode.className = 'splashSuccessImage';
	}
};

step.prototype.spin = function(){
	mark("start splash step " + this.id);
	this.state = this.HAPPENING;
	if (this.domNode) {
		this.domNode.className = 'splashLoadingImage';
	}
};

step.prototype.getStepNode = function() {
	
	var stepNode = document.createElement( 'div' );
	stepNode.className = 'splashStep';
	var inner =  '<div class="splashVisual">' + 
								'<div id="step' + this.order + '"></div>' +
							'</div>' +
							'<div class="splashVerbal">' + this.description + '</div>';
	lib.setSafeInnerHTML(stepNode, inner);
	this.domNode = stepNode.firstChild.firstChild;
	
	if (this.state === this.HAPPENING) {
		this.domNode.className = 'splashLoadingImage';
	} else if (this.state === this.COMPLETED) {
		this.domNode.className = 'splashSuccessImage';
	}
	
	return stepNode;
};

step.prototype.transition = function(){
	switch( this.state ){
	 
		case this.WAITING:
			this.state = this.HAPPENING;
			/* add happening class */
			break;
			
		case this.HAPPENING:
			this.state = this.COMPLETED;
			/* add completed class */
			break;
	}
};

function loader( domNode, title ){

	this.domNode = domNode;
	this.content;
	this.title = title;
	this.steps = [];   
	this.FILLER_TIMEOUT = 200;
	if (window.performance && window.performance.now) {
		this.FILLER_TIMEOUT = window.performance.now() / 7;
	}

	this.template = '<div class="splashLoader">' +
						'<label class="splashAbout" for="progressbar">' + this.title + '</label>' +
						'<div class="splashProgressbar">' +
							'<progress id ="progressbar" aria-describedby="stepMessages"></progress>' +
						'</div>' +
						'<div id="steps" class="splashSteps">' +
						'</div>' +
						'<div id="stepMessages" class="splashMessages" role="status" aria-live="off">' +
						'</div>' +
					'</div>';   
	
	this.interval;
	
	this.currentStep = -1;
}

loader.prototype.showSteps = function() {
	this.stepsShown = true;
	this.initialize();
	this.drawSteps();
	this.update();
};

loader.prototype.showFillerProgress = function(){
	var cs = this.getStep();
	if (!cs) {
		this.stopFillerProgress();
		return;
	}
	var increment = (cs.total - cs.worked)/10;
	cs.worked = Math.min(cs.worked + increment, cs.total);
	this.update();
};

loader.prototype.startFillerProgress = function() {
	var cs = this.getStep();
	if (!cs || cs.type !== cs.TYPE_FILLER) return;
	this.interval = setInterval(function(){ this.showFillerProgress(); }.bind(this), this.FILLER_TIMEOUT);
};
	
loader.prototype.stopFillerProgress = function () {
	if (!this.interval) return;
	clearInterval(this.interval);
	delete this.interval;
};

loader.prototype.nextStep = function(){
	
	var myStep;
	
	/* complete current step */
	
	if( this.currentStep >= 0  ){
		
		myStep = this.getStep();
	
		switch( myStep.type ){

			case myStep.TYPE_FILLER:
				this.stopFillerProgress();
				myStep.complete();
				break;

			case myStep.TYPE_DRIVEN:
				myStep.complete();
				break;
		}
	}
	
	/* initaliate next step */
	this.currentStep = this.currentStep + 1;
	
	if (this.currentStep === 2) {
		this.splash.classList.add("splashSeeThrough");
	}
	
	myStep = this.getStep();
	
	if (!myStep) return;
	
	switch( myStep.type ){

			case myStep.TYPE_FILLER:
				this.startFillerProgress();
				myStep.spin();
				break;

			case myStep.TYPE_DRIVEN:
				myStep.spin();
				break;
	}
	this.update();
};

loader.prototype.initialize = function(){
	this.content = document.getElementById( this.domNode );
	lib.setSafeInnerHTML(this.content, this.template);
	this.splashProgress = document.getElementById( "progressbar" );
	this.stepMessages = document.getElementById( "stepMessages" );
	this.splashProgress.value = 0;
};

loader.prototype.emptySteps = function(){
	var stepsNode = document.getElementById( 'steps' );
	while( stepsNode.firstChild ){
		stepsNode.removeChild( stepsNode.firstChild ) ;
	}   
};

loader.prototype.getStep = function(id){
	if (!id) return this.steps[this.currentStep];
	
	for (var s = 0; s < this.steps.length; s++) {
		if (this.steps[s].id === id) return this.steps[s];
	}
	return null;
};

loader.prototype.drawSteps = function(){
	if (!this.stepsShown) return;
	
	this.emptySteps();
	
	var stepsNode = document.getElementById( 'steps' );
	
	for( var s in this.steps ){
		var nextStep = this.steps[s];
		stepsNode.appendChild( nextStep.getStepNode() );
	}
};

loader.prototype.addStep = function( step, index ){
	step.order = this.steps.length;
	this.steps.splice(index || this.steps.length, 0, step);
	this.drawSteps();
	this.update();
};

loader.prototype.worked = function(increment){
	var cs = this.getStep();
	cs.worked = cs.worked + (increment || 1);
	if (cs.worked === cs.total) {
		this.nextStep();   
	} else {
		this.update();
	}
};

loader.prototype.update = function(){
	if (!this.stepsShown) return;

	var cs = this.getStep();
	if (!cs) return;
	
	var worked = 0, s;
	
	for(s = 0; s < cs.order; s++){
		worked = worked + this.steps[s].total;
	}

	var total = worked;
	worked += cs.worked;
	
	for(; s < this.steps.length; s++){
		total += this.steps[s].total;
	}
	
	lib.setSafeInnerHTML(this.stepMessages, "");
	var message = cs.message || "";
	var detailedMessage = cs.detailedMessage || "";
	if (!Array.isArray(message)) message = [message];
	if (!Array.isArray(detailedMessage)) detailedMessage = [detailedMessage];
	message.forEach(function(msg, i) {
		if (!msg) return;
		var msgDiv = document.createElement("div");
		msgDiv.className = "splashMessage";
		msgDiv.textContent = msg;
		this.stepMessages.appendChild(msgDiv);
		msgDiv = document.createElement("div");
		msgDiv.className = "splashDetailedMessage";
		msgDiv.textContent = (msg !== detailedMessage[i] ? detailedMessage[i] : null) || '\u00A0';
		this.stepMessages.appendChild(msgDiv);
	}.bind(this));

	var splashProgress = this.splashProgress;
	if (splashProgress) {
		splashProgress.max = total;
		splashProgress.value = Math.ceil(worked);
	}	
};

loader.prototype.takeDown = function() {
	if (!pageLoader) return;
	pageLoader = null;
	if (this.pluginRegistry) {
		this.pluginRegistry.removeEventListener("started", this._pluginListener);
		this.pluginRegistry.removeEventListener("lazy activation", this._pluginListener);
		this.pluginRegistry.removeEventListener("starting", this._pluginListener);		
	}
	this.nextStep();
	var splash = document.getElementById("splash");
	if (splash && splash.parentNode) {
		splash.parentNode.removeChild(splash);
	}

	// Remove "busy" from all elements.
	for(var child = document.body.firstElementChild; child !== null; child = child.nextElementSibling) {
		if (child.tagName !== "SCRIPT") {
			child.removeAttribute("aria-busy");
		}
	}
};

loader.prototype.createStep = function(id, description, type, total) {
	return new step(id, description, type, total);
};

loader.prototype.setPluginRegistry = function(pluginRegistry) {
	this.pluginRegistry = pluginRegistry; 
	var listener = this._pluginListener = function(evt) {
		var s = this.getStep();
		if (!s || s.id !== "orion.splash.plugins") return;
		var pluginName = evt.plugin.getName();
		if (!pluginName) return;
		s.message = i18nUtil.formatMessage(messages["plugin_" + evt.type], pluginName);
		this.update();
	}.bind(this);
	pluginRegistry.addEventListener("started", listener);
	pluginRegistry.addEventListener("lazy activation", listener);
	pluginRegistry.addEventListener("starting", listener);
};

function start() {
	new Banner().create(document.body);
	
	var splash = document.getElementById("splash");
	if (!splash) return;
	
	// Mark all elements behind the splash as "busy" until splash is torn down so screen readers don't go there.
	for(var child = document.body.firstElementChild; child !== null; child = child.nextElementSibling) {
		if (child !== splash && child.tagName !== "SCRIPT") {
			lib.setSafeAttribute(child, "aria-busy", "true");
		}
	}
	
	var showTimeout = 3000;
	var splashTimout = util.readSetting("showSplashTimeout");
	if (splashTimout) {
		try {
			showTimeout = parseInt(splashTimout, 10);
		} catch (ex) {}
	}
	setTimeout(function() {
		if (!pageLoader) return;
		pageLoader.showSteps();
	}, showTimeout);

	var config = module.config();
	pageLoader = new loader('splashContainer', messages["SplashTitle" + (config.splashID || "")]);
	var initial = new step("orion.splash.page", messages.LoadingPage, 0, 50);
	pageLoader.addStep(initial);
	pageLoader.splash = splash;
	
	var pluginStep;
	pluginStep = new step("orion.splash.plugins", messages.LoadingPlugins, 0, 20);
	pageLoader.addStep(pluginStep );
	
	pluginStep = new step("orion.splash.resources", messages.LoadingResources, 0, 30);
	pageLoader.addStep(pluginStep);
	
	pageLoader.nextStep();
}

start();

return {
	getPageLoader: function() { return pageLoader; }
};
});

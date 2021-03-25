/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/nls/messages', 'orion/webui/littlelib', 'orion/webui/dialogs/OperationsDialog',
	'orion/webui/tooltip', 'orion/Deferred',
], 
function(messages, lib, mOperationsDialog, Tooltip, Deferred) {
	
	function ProgressMonitorTool(progressPane, commandRegistry, preferenceService){
		if(this._progressPane){
			return;
		}
		var prefDeferred = new Deferred();
		if (Boolean(preferenceService)) {
			preferenceService.get("/progressIndicator").then(function(prefs) {
				prefDeferred.resolve(prefs);
			});
		} else {
			prefDeferred.resolve();
		}
		prefDeferred.then(function(prefs) {
			if (Boolean(prefs) && prefs.disabled === true) {
				var pane = lib.node(progressPane);
				if (Boolean(pane)) {
					pane.parentElement.removeChild(pane);				
				}
				return;
			}
			this._progressPane = lib.node(progressPane);
	
			this._makeTooltip(messages["Operations"]); //$NON-NLS-0$
	
			this._operationsDialog = new mOperationsDialog.OperationsDialog({triggerNode: this._progressPane, commandRegistry: commandRegistry});
			var that = this;
			this._progressPane.addEventListener("keydown", function(evt) {  //$NON-NLS-0$
				if(evt.charOrCode === ' ' || evt.keyCode === lib.KEY.ENTER) { //$NON-NLS-0$
					that._operationsDialog.show();
				}
			});
			
			this._progressPane.addEventListener("click", /* @callback */ function(evt) {  //$NON-NLS-0$
				if (that._operationsDialog.isShowing()) {
					that._operationsDialog.hide();
				} else {
					that._operationsDialog.show();
				}
			});
			
			this._operationsDialog.setOperations(null, null); // initialize
		}.bind(this));
	}
	
	ProgressMonitorTool.prototype = {
			_makeTooltip: function(message) {
				if (this._progressPane.tooltip) {
					this._progressPane.tooltip.destroy();
				}
				this._progressPane.tooltip = new Tooltip.Tooltip({
					node: this._progressPane,
					text: message,
					position: ["left", "above", "below", "right"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			_switchIconTo: function(iconClass) {
				if (this._lastIconClass) {
					this._progressPane.classList.remove(this._lastIconClass);
				}
				this._lastIconClass = iconClass;
				this._progressPane.classList.add(this._lastIconClass);
			},
			generateOperationsInfo: function(operations, deferreds){
				
				var operationsToDisplay = {};
				for(var i in operations){
					if(!operations[i].progressMonitor){
						operationsToDisplay[i] = operations[i];
					}
				}
				
				if(this._isEmpty(operationsToDisplay)){
					this._switchIconTo("progressPane_empty"); //$NON-NLS-0$
					this._makeTooltip(messages["Operations"]); //$NON-NLS-0$
					if(this._progressPane.hasAttribute("aria-valuetext")) { //$NON-NLS-0$
						this._progressPane.removeAttribute("aria-valuetext"); //$NON-NLS-0$
					}
					this._operationsDialog.setOperations(operationsToDisplay, deferreds);
					return;
				}
				
				var status = "";
				for(var j in operationsToDisplay){
					var operation = operationsToDisplay[j];
					if(operation.type && (operation.type==="loadstart" || operation.type==="progress")){
						status = "running"; //$NON-NLS-0$
						break;
					}
				}
				
				// TODO fixme this entire block does nothing
				if(status==="" && this._lastOperation!=null){
					if(this._lastOperation.type && this._lastOperation.type==="error"){
						status==="error";
					}
				}
				switch(status){
				case "running": //$NON-NLS-0$
					this._makeTooltip(messages["Operations running"]); //$NON-NLS-0$
					lib.setSafeAttribute(this._progressPane, "aria-valuetext", messages['Operations running']);
					this._switchIconTo("running"); //$NON-NLS-0$
					break;
				case "warning": //$NON-NLS-0$
					this._makeTooltip(messages["SomeOpWarning"]); //$NON-NLS-0$
					lib.setSafeAttribute(this._progressPane, "aria-valuetext", messages['SomeOpWarning']);
					this._switchIconTo("warning"); //$NON-NLS-0$
					break;
				case "error": //$NON-NLS-0$
					this._makeTooltip(messages["SomeOpErr"]); //$NON-NLS-0$
					lib.setSafeAttribute(this._progressPane, "aria-valuetext", messages['SomeOpErr']);
					this._switchIconTo("error"); //$NON-NLS-0$
					break;
				default:
					this._makeTooltip(messages["Operations"]); //$NON-NLS-0$
					if(this._progressPane.hasAttribute("aria-valuetext")) { //$NON-NLS-0$
						this._progressPane.removeAttribute("aria-valuetext"); //$NON-NLS-0$
					}
					this._switchIconTo("progressPane_empty");					 //$NON-NLS-0$
				}
				this._operationsDialog.setOperations(operationsToDisplay, deferreds);
			},
			_isEmpty: function(object){
				for(var key in object){
					return false;
				}
				return true;
			}
	};
	
	ProgressMonitorTool.prototype.constructor = ProgressMonitorTool;
	
	/**
	 * Service for tracking operations changes
	 * @class Service for tracking operations changes
	 * @name orion.progress.ProgressService
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.operationsclient.OperationsClient} operationsClient
	 */
	function ProgressService(serviceRegistry, operationsClient, commandRegistry, progressMonitorClass, preferenceService){
		this._serviceRegistry = serviceRegistry;
		this._serviceRegistration = serviceRegistry.registerService("orion.page.progress", this); //$NON-NLS-0$ 
		this._commandRegistry = commandRegistry;
		this._operationsClient = operationsClient;
		this._operations = {};
		this._operationDeferrds = {};
		this._operationsIndex = 0;
		this._lastOperation = null;
		this._lastIconClass = null;
		this._progressMonitorClass = progressMonitorClass;
		this._preferenceService = preferenceService;
	}
	
	ProgressService.prototype = /** @lends orion.progress.ProgressService.prototype */ {
			init: function(progressPane){
				if(this._progressMonitorClass){
					return; // we have an other progress monitor implementation, we don't need to initialize our UI
				}
				this._progressMonitorTool = new ProgressMonitorTool(progressPane, this._commandRegistry, this._preferenceService);
			},
			progress: function(deferred, operationName, progressMonitor){
				var that = this;
				var operationsIndex = this._operationsIndex++;
				if(!progressMonitor && this._progressMonitorClass){
					progressMonitor = new this._progressMonitorClass();
					progressMonitor.begin(operationName);
				}
				deferred.then(/* @callback */ function(result){
					if(that._operations[operationsIndex]){
						var operation = that._operations[operationsIndex];
						if(operationName)
							operation.Name = operationName;
						that._lastOperation = operation;
						operation.type = "loadend"; //$NON-NLS-1$
						if(progressMonitor){
							operation.progressMonitor = progressMonitor;
						}
						that.writeOperation.bind(that)(operationsIndex, operation, deferred);
						if(!operation.Location){
							that._removeOperationFromTheList.bind(that)(operationsIndex);
						}
					}
				}, function(error){
					if(that._operations[operationsIndex]){
						var operation = that._operations[operationsIndex];
						if(operationName)
							operation.Name = operationName;
						if(progressMonitor){
							operation.progressMonitor = progressMonitor;
						}
						that._lastOperation = operation;
						operation.type = error.canceled ? "abort" : "error"; //$NON-NLS-1$ //$NON-NLS-2$
						operation.error = error; 
						that.writeOperation.bind(that)(operationsIndex, operation, deferred);
						if(!operation.Location){
							that._removeOperationFromTheList.bind(that)(operationsIndex);
						}
					}
				}, function(operation){
					if(operationName)
						operation.Name = operationName;
					if(progressMonitor){
						operation.progressMonitor = progressMonitor;
					}
					that.writeOperation.bind(that)(operationsIndex, operation, deferred);
				});
				return deferred;
			},
			removeOperation: function(operationLocation){
				var that = this;
				for(var i in this._operations){
					if(this._operations[i].Location && this._operations[i].Location===operationLocation){
						this._removeOperationFromTheList(i);
						break;
					}
				}
				that._operationsClient.removeOperation.bind(that._operationsClient)(operationLocation);
			},
			_removeOperationFromTheList: function(operationId){
				var progressMonitor = this._operations[operationId].progressMonitor;
				delete this._operations[operationId];
				delete this._operationDeferrds[operationId];
				if(progressMonitor){
					progressMonitor.done();
				}else{
					this._progressMonitorTool.generateOperationsInfo(this._operations, this._operationDeferrds); 
				}
			},
			removeCompletedOperations: function(){
				for(var i in this._operations){
					var operation = this._operations[i];
					if(operation.type && operation.type!=="loadstart" && operation.type!=="progress"){
						var progressMonitor = this._operations[i].progressMonitor;
						if(progressMonitor)
							progressMonitor.done();
						delete this._operations[i];
						delete this._operationDeferrds[i];
					}
				}
				this._progressMonitorTool.generateOperationsInfo(this._operations, this._operationDeferrds);
			},
			setProgressResult: function(result){
				this._serviceRegistry.getService("orion.page.message").setProgressResult(result); //$NON-NLS-0$
			},
			/**
			 * Shows a progress message until the given promise is resolved. Returns a promise that resolves when
			 * the operation completes. If the given promise rejects, the default behavior is to show an error
			 * message, but this can be suppressed by passing <tt>avoidDisplayError == true</tt>.
			 * @param {orion.Promise} promise Promise to track
			 * @param {String} message Message to display
			 * @param {Boolean} avoidDisplayError Do not display error when promise is rejected
			 * @returns {orion.Promise}
			 */
			showWhile: function(deferred, message, avoidDisplayError){
				this._serviceRegistry.getService("orion.page.message").showWhile(deferred, message); //$NON-NLS-1$

				var that = this;
				// If the underlying deferred was rejected, display an error
				deferred.then(null, function(error) {
					if (avoidDisplayError) {
						// do nothing
					} else {
						that.setProgressResult(error);
					}
				});
				return this.progress(deferred, message);
			},
			writeOperation: function(operationIndex, operation, deferred){
				this._operations[operationIndex] = operation;
				this._operationDeferrds[operationIndex] = deferred;
				if(operation.Location){
					this._operationsClient.addOperation(operation.Location, {Name: operation.Name, expires: operation.expires});
				}
				if(operation.progressMonitor){
					operation.progressMonitor.progress(operation.Name);
				}else{
					this._progressMonitorTool.generateOperationsInfo(this._operations, this._operationDeferrds);
				}
			}
	};
			
	ProgressService.prototype.constructor = ProgressService;
	//return module exports
	return {ProgressService: ProgressService};
	
});

/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var apps = require("./apps");
var async = require("async");
var target = require("./target");

var createExtServices = exports.createExtServices = function(req, appTarget, appCache) {
    var serviceDeclaration = appCache.manifest['declared-services'];
    if(serviceDeclaration){
        var serviceNames = Object.keys(serviceDeclaration);
        return new Promise(function(fulfill,reject){
            async.each(serviceNames, function(serviceName, cb) {
                return apps.getServiceGuid(req.user.username, serviceName, appTarget)
                    .then(function(serviceInstanceGUID){
                        if(!serviceInstanceGUID){
                        /* no service instance bound to the application, create one if possible */
                        /* support both 'type' and 'label' fields as service type */
                        var serviceType = serviceDeclaration[serviceName].type || serviceDeclaration[serviceName].label;
                        var serviceProvider = serviceDeclaration[serviceName].provider || null;
                        var servicePlan = serviceDeclaration[serviceName].plan;
                        
                        return getServicebyName(req.user.username, serviceType, appTarget)
                        .then(function(respondServiceJson){
                            var servicePlanGuid = findServicePlanGUID(serviceType,serviceProvider,servicePlan,respondServiceJson.resources);
                            function findServicePlanGUID(serviceType,serviceProvider,servicePlan, resources){
                                for(var k = 0; k < resources.length; k++){
                                    /* if not explicit provider was given, assume a "null" provider */
                                    if(serviceType === resources[k].entity.label && (!serviceProvider || serviceProvider === resources[k].entity.provider)){
                                        var servicePlans = resources[k].entity.service_plans;
                                        for(var j = 0; j < servicePlans.length ; j++){
                                            if(servicePlan){
                                                /* user-provided plan, treat explicitly */
                                                if( servicePlan === servicePlans[j].entity.name){
                                                    return servicePlans[j].metadata.guid;
                                                }
                                            }else if(servicePlan=== "free" || servicePlan=== "Free"){
                                                return servicePlans[j].metadata.guid;
                                            }
                                        }	
                                    }
                                }
                            }
                            if(!servicePlanGuid) cb({"message":"Could not find service instance " + serviceName +" nor service "+ serviceType+" with plan "+ servicePlan + " in target."});
                            return apps.createService(req.user.username, serviceName, servicePlanGuid, appTarget)
                            .then(function(serviceGuid){
                                return serviceInstanceGUID = serviceGuid;
                            });
                        });
                    }
                    return serviceInstanceGUID;
                }).then(function(){
                    return cb();
                })
                .catch(function(err) {
                    cb(err);
                });
            }, function(err) {
                if(err){
                    return reject(err);
                }
                return fulfill();
            });
        });
    }
}

function getServicebyName(userId, serviceName, appTarget){
	return target.cfRequest("GET", userId, appTarget.Url + "/v2/spaces/" + appTarget.Space.metadata.guid + "/services"
	, {"inline-relations-depth":"1","q":"label:"+serviceName}, null, null, null, appTarget);
}

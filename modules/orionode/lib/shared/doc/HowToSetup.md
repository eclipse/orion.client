- 1: in bundles/org.eclipse.orion.client.ui/web/defaults.pref,   add another plugin: collab/plugins/collabPlugin.html": true under "/plugins"
- 2: in bundles/org.eclipse.orion.client.ui/web/defaults.pref, add another default value "/collab": { "hubUrl": "ws://localhost:8082/" }, the value "localhost:8082" depends on your orion.collab server's url.
- 3: in modules/orionode/orion.conf, change "orion.single.user" to false, and add a random string to "orion.jwt.secret", and change "collabMode" to true;
- 4: in modules/orionode.collab.hub/config.js use the same random string to "jwt_secret", and specify the main server's url to "orion"
- 5: run mongodb, run orion node server, run orion.collab server
- 6: have fun.


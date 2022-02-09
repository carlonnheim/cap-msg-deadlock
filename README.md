# Setup

Create the event mesh service

`cf create-service enterprise-messaging default lock-test -c ./eventmesh-options.json`

Deploy the db

`cds deploy --to hana`

Bind for local run

`cf bind-local -path .vscode/.env -service-names lock-test`

`cf bind-local -path .vscode/.env -service-names cap-msg-deadlock-db`

## Run scenarios

Run the scenarios using the launcher or start a debugger shell and run scenarios like `DEBUG=hana SCENARIO=A npx cds run`. The processor function runs different scenarios based on the given variable. Then replace the hdb module in package.json with the @sap/hana-client module and run the same scenarios.

|Scenario|Using hdb|Using @sap/hana-client|
|--------|---------|----------------------|
|A - Succeed after one second|As expected|As expected|
|B - Fail after one second, but throw without an error message|Error is discarded|Error is discarded|
|C - Fail after one second throwing a regular error|As expected|As expected|
|D - Lock an independent resouce for 1 second, then succeed|As expected|As expected|
|E - Lock a common resource for 1 second, then succeed|As expected|Locks are not released. Process is trickle feeding. Trying to stop the process with Ctrl+C does not work. The locks will eventually time out or sessions can be cancelled from the HANA Cockpit.|
|F - Lock an independent resource for 1 second, then fail|As expected|As expected|
|G - Lock a common resource for 1 second, then fail|As expected|Same pattern as in Scenario E|
|H - Lock a common resource for 1 second, then trigger a consistency error|As expected|Same pattern as in Scenario E|

cd ..
if exist .git\hooks\commit-msg goto :compile
copy /Y jira_script\jira_git\rely\commit-msg .git\hooks
goto :compile


:compile
cd .\scripts
..\..\pi_build\bin\node\node ..\..\pi_build\dst\init.js

pause;
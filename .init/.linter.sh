#!/bin/bash
cd /home/kavia/workspace/code-generation/ai-copilot-web-application-4336-4290/react_js_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


#!/bin/bash
# Reprocess pages with unknown schedules

echo "Pages with unknown schedules:"
cat data/schedules/schedules.json | jq -r '[.[] | select(.scheduleType == "unknown") | .pageNumber] | unique | sort | .[]'

echo ""
read -p "Clear these pages and reprocess? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Clear progress for these pages
  PAGES=$(cat data/schedules/schedules.json | jq -r '[.[] | select(.scheduleType == "unknown") | .pageNumber] | unique | .[]')
  
  for page in $PAGES; do
    jq ".completedPages |= map(select(. != $page))" data/progress/Shell_Set.json > tmp.$$.json && mv tmp.$$.json data/progress/Shell_Set.json
  done
  
  # Clear unknown schedules from storage
  jq 'to_entries | map(select(.value.scheduleType != "unknown")) | from_entries' data/schedules/schedules.json > tmp.$$.json && mv tmp.$$.json data/schedules/schedules.json
  
  echo "Cleared unknown schedules. Reprocessing..."
  npm run process source-single data/lancedb
fi

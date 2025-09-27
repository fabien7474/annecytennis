#!/bin/bash

# This is a simple Bash script for executing commands
# Author: Your Name
# Date: $(date)

echo "Welcome to the commandes.sh script!"

# Get ACCESS TOKEN
ACCESS_TOKEN=$(curl -X POST https://auth.igloohome.co/oauth2/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=cqgor3q88x3q78x8polmlhmidr&client_secret=l01pqmza6dlrx1hlth9yxheil5kbcqh5ouehevj4fxq5sf4sc6j" | ./jq.exe -r .access_token)

# Prompt user for parameters
current_hour=$(date +"%Y-%m-%dT%H:00:00%z")
read -p "Enter start date (YYYY-MM-DDTHH:00:00+TZ) [${current_hour}]: " start_date
start_date=${start_date:-$current_hour}

# Calculate default end date as start date + 1 day
start_date_plus_one_day=$(date -d "${start_date} +1 day" +"%Y-%m-%dT%H:00:00%z")
# Calculate end of day to be the first hour of the following day of the start day
end_of_day=$(date -d "${start_date:0:10} +1 day" +"%Y-%m-%dT00:00:00%z")
read -p "Enter end date (YYYY-MM-DDTHH:00:00+TZ) [${end_of_day}]: " end_date
end_date=${end_date:-$end_of_day}

# Echo the request body to the console
request_body=$(cat <<EOF
{
    "startDate": "$start_date",
    "endDate": "$end_date",
    "variance": "1",
    "accessName": "Guest"
}
EOF
)
echo "Request body:"
echo "$request_body"

# Generate an Algopin of one hour
curl -X POST https://api.igloodeveloper.co/igloohome/devices/IGK330c7db37/algopin/hourly \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "startDate": "'$start_date'",
            "endDate": "'$end_date'",
            "variance": "1",
            "accessName": "Guest"
        }'



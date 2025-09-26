#!/bin/bash

# This is a simple Bash script for executing commands
# Author: Your Name
# Date: $(date)

echo "Welcome to the commandes.sh script!"

# Get ACCESS TOKEN
ACCESS_TOKEN=$(curl -X POST https://auth.igloohome.co/oauth2/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=cqgor3q88x3q78x8polmlhmidr&client_secret=l01pqmza6dlrx1hlth9yxheil5kbcqh5ouehevj4fxq5sf4sc6j" | jq -r .access_token)

    # Prompt user for parameters
    read -p "Enter start date (YYYY-MM-DDTHH:MM:SS+TZ): " start_date
    read -p "Enter end date (YYYY-MM-DDTHH:MM:SS+TZ): " end_date

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


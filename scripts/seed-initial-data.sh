#!/bin/bash

# Initial data seeding script for DynamoDB
# This script loads studio, plans, and options data into DynamoDB tables

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DATA_DIR="${SCRIPT_DIR}/seed-data"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it first."
    exit 1
fi

# Check environment argument
if [ -z "$1" ]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 dev"
    exit 1
fi

ENVIRONMENT=$1
REGION="ap-northeast-1"

# Table names (prefixed with environment)
STUDIO_TABLE="${ENVIRONMENT}-zebra-studios"
PLANS_TABLE="${ENVIRONMENT}-zebra-plans"
OPTIONS_TABLE="${ENVIRONMENT}-zebra-options"

echo "=========================================="
echo "Initial Data Seeding for Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo "=========================================="

# Function to convert JSON to DynamoDB format with proper types
convert_to_dynamodb() {
    jq -c '
    def to_dynamodb_value:
        if . == null then
            {"NULL": true}
        elif type == "boolean" then
            {"BOOL": .}
        elif type == "number" then
            {"N": (. | tostring)}
        elif type == "array" then
            {"L": [.[] | {"S": .}]}
        elif type == "string" then
            {"S": .}
        else
            {"S": (. | tostring)}
        end;

    . | to_entries | map({(.key): (.value | to_dynamodb_value)}) | add
    '
}

# Seed Studio data
echo ""
echo "[1/3] Seeding Studio data..."
studio_item=$(cat "${SEED_DATA_DIR}/studio.json" | convert_to_dynamodb)
aws dynamodb put-item \
    --region "$REGION" \
    --table-name "$STUDIO_TABLE" \
    --item "$studio_item" \
    --output json > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Successfully seeded studio data"
else
    echo "✗ Failed to seed studio data"
    exit 1
fi

# Seed Plans data
echo ""
echo "[2/3] Seeding Plans data..."
plans_items=$(cat "${SEED_DATA_DIR}/plans.json" | jq -c '[.[] | . as $item | $item]')
for plan in $(echo "$plans_items" | jq -c '.[]'); do
    item=$(echo "$plan" | convert_to_dynamodb)
    aws dynamodb put-item \
        --region "$REGION" \
        --table-name "$PLANS_TABLE" \
        --item "$item" \
        --output json > /dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo "✗ Failed to seed plan: $plan"
        exit 1
    fi
done
echo "✓ Successfully seeded plans data"

# Seed Options data
echo ""
echo "[3/3] Seeding Options data..."
options_items=$(cat "${SEED_DATA_DIR}/options.json" | jq -c '[.[] | . as $item | $item]')
for option in $(echo "$options_items" | jq -c '.[]'); do
    item=$(echo "$option" | convert_to_dynamodb)
    aws dynamodb put-item \
        --region "$REGION" \
        --table-name "$OPTIONS_TABLE" \
        --item "$item" \
        --output json > /dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo "✗ Failed to seed option: $option"
        exit 1
    fi
done
echo "✓ Successfully seeded options data"

echo ""
echo "=========================================="
echo "Initial data seeding completed successfully!"
echo "=========================================="
echo ""
echo "Verify data with:"
echo "  aws dynamodb scan --table-name ${STUDIO_TABLE} --region ${REGION}"
echo "  aws dynamodb scan --table-name ${PLANS_TABLE} --region ${REGION}"
echo "  aws dynamodb scan --table-name ${OPTIONS_TABLE} --region ${REGION}"

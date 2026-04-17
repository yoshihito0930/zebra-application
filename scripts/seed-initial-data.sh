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

# Function to convert JSON array to DynamoDB batch-write format
convert_to_dynamodb_format() {
    local input_file=$1
    local output_file=$2

    jq -c '.[] | {PutRequest: {Item: . | to_entries | map({(.key): {S: (.value | tostring)}}) | from_entries}}' "$input_file" > "$output_file"
}

# Function to seed data with batch-write-item
seed_table() {
    local table_name=$1
    local json_file=$2
    local temp_file="${SEED_DATA_DIR}/temp_${table_name}.json"

    echo ""
    echo "Seeding ${table_name}..."

    # Convert JSON to DynamoDB format
    items=$(jq -c "[.[] | {PutRequest: {Item: (. | with_entries(.value = {S: (.value | tostring)}))}}]" "$json_file")

    # Create batch-write request format
    request_items=$(jq -n --arg table "$table_name" --argjson items "$items" '{($table): $items}')

    # Write to DynamoDB
    aws dynamodb batch-write-item \
        --region "$REGION" \
        --request-items "$request_items" \
        --output json

    if [ $? -eq 0 ]; then
        echo "✓ Successfully seeded ${table_name}"
    else
        echo "✗ Failed to seed ${table_name}"
        exit 1
    fi
}

# Seed Studio data
echo ""
echo "[1/3] Seeding Studio data..."
studio_item=$(jq -c '. | with_entries(.value = {S: (.value | tostring)})' "${SEED_DATA_DIR}/studio.json")
aws dynamodb put-item \
    --region "$REGION" \
    --table-name "$STUDIO_TABLE" \
    --item "$studio_item" \
    --output json

if [ $? -eq 0 ]; then
    echo "✓ Successfully seeded studio data"
else
    echo "✗ Failed to seed studio data"
    exit 1
fi

# Seed Plans data
echo ""
echo "[2/3] Seeding Plans data..."
seed_table "$PLANS_TABLE" "${SEED_DATA_DIR}/plans.json"

# Seed Options data
echo ""
echo "[3/3] Seeding Options data..."
seed_table "$OPTIONS_TABLE" "${SEED_DATA_DIR}/options.json"

echo ""
echo "=========================================="
echo "Initial data seeding completed successfully!"
echo "=========================================="
echo ""
echo "Verify data with:"
echo "  aws dynamodb scan --table-name ${STUDIO_TABLE} --region ${REGION}"
echo "  aws dynamodb scan --table-name ${PLANS_TABLE} --region ${REGION}"
echo "  aws dynamodb scan --table-name ${OPTIONS_TABLE} --region ${REGION}"

#!/bin/bash

# Cognito JWT Token取得スクリプト

set -e

# .envファイルから環境変数を読み込む
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# 必要な変数のチェック
if [ -z "$TEST_USER_POOL_ID" ] || [ -z "$TEST_CLIENT_ID" ] || [ -z "$TEST_USERNAME" ] || [ -z "$TEST_PASSWORD" ]; then
  echo "Error: Required environment variables are not set"
  echo "Please check your .env file for:"
  echo "  - TEST_USER_POOL_ID"
  echo "  - TEST_CLIENT_ID"
  echo "  - TEST_USERNAME"
  echo "  - TEST_PASSWORD"
  exit 1
fi

echo "=========================================="
echo "Cognito JWT Token取得"
echo "=========================================="
echo ""
echo "User Pool ID: $TEST_USER_POOL_ID"
echo "Client ID: $TEST_CLIENT_ID"
echo "Username: $TEST_USERNAME"
echo ""

# User Pool IDからリージョンを抽出
REGION=$(echo "$TEST_USER_POOL_ID" | cut -d'_' -f1)

# Cognitoクライアントシークレットを取得
echo "Fetching client secret from region: $REGION..."
CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$TEST_USER_POOL_ID" \
  --client-id "$TEST_CLIENT_ID" \
  --region "$REGION" \
  --query 'UserPoolClient.ClientSecret' \
  --output text 2>/dev/null)

if [ -z "$CLIENT_SECRET" ] || [ "$CLIENT_SECRET" = "None" ]; then
  echo "Client does not have a secret. Using USER_PASSWORD_AUTH without SECRET_HASH..."
  
  # シークレットなしで認証
  RESPONSE=$(aws cognito-idp initiate-auth \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id "$TEST_CLIENT_ID" \
    --auth-parameters "USERNAME=$TEST_USERNAME,PASSWORD=$TEST_PASSWORD" \
    --region "$REGION" \
    --query 'AuthenticationResult.IdToken' \
    --output text)
else
  echo "Client has a secret. Calculating SECRET_HASH..."
  
  # SECRET_HASHを計算
  MESSAGE="$TEST_USERNAME$TEST_CLIENT_ID"
  SECRET_HASH=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$CLIENT_SECRET" -binary | base64)
  
  # シークレットハッシュを使用して認証
  RESPONSE=$(aws cognito-idp initiate-auth \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id "$TEST_CLIENT_ID" \
    --auth-parameters "USERNAME=$TEST_USERNAME,PASSWORD=$TEST_PASSWORD,SECRET_HASH=$SECRET_HASH" \
    --region "$REGION" \
    --query 'AuthenticationResult.IdToken' \
    --output text)
fi

if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "None" ]; then
  echo ""
  echo "Error: Failed to get ID token"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ ID Token取得成功"
echo "=========================================="
echo ""
echo "$RESPONSE"
echo ""
echo "このトークンを使用してAPIをテストできます："
echo ""
echo "export JWT_TOKEN=\"$RESPONSE\""
echo "curl -X GET \"$TEST_API_URL/v1/knowledge/list\" \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\""
echo ""

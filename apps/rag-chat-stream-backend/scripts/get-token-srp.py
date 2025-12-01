#!/usr/bin/env python3
"""
Cognito SRP認証を使用してIDトークンを取得するスクリプト
"""

import boto3
import os
from warrant import Cognito

# 環境変数から設定を読み込む
USER_POOL_ID = os.getenv('TEST_USER_POOL_ID', 'ap-northeast-1_jx0w9wIER')
CLIENT_ID = os.getenv('TEST_CLIENT_ID', '1phpshb1e4r339a7b7ad81gg1p')
USERNAME = os.getenv('TEST_USERNAME', 'y.s@innovators.jp')
PASSWORD = os.getenv('TEST_PASSWORD', 'CCjO5Lc&')
REGION = USER_POOL_ID.split('_')[0]

print("=" * 50)
print("Cognito SRP認証でIDトークンを取得")
print("=" * 50)
print(f"\nUser Pool ID: {USER_POOL_ID}")
print(f"Client ID: {CLIENT_ID}")
print(f"Username: {USERNAME}")
print(f"Region: {REGION}\n")

try:
    # Cognitoクライアントを初期化
    u = Cognito(
        USER_POOL_ID,
        CLIENT_ID,
        username=USERNAME,
        client_secret='niovkroii87gru8nflltuhipu7g5c4emldkads6u43oov5d82oa'
    )
    
    # 認証
    u.authenticate(password=PASSWORD)
    
    # IDトークンを取得
    id_token = u.id_token
    
    print("=" * 50)
    print("✅ IDトークン取得成功")
    print("=" * 50)
    print(f"\n{id_token}\n")
    print("このトークンを使用してAPIをテストできます：\n")
    print(f'export JWT_TOKEN="{id_token}"')
    print('curl -X GET "https://mw5wxwbbv1.execute-api.us-east-1.amazonaws.com/prod/v1/knowledge/list" \\')
    print('  -H "Authorization: Bearer $JWT_TOKEN"')
    print()
    
except Exception as e:
    print(f"\n❌ エラー: {e}\n")
    print("warrant パッケージをインストールしてください：")
    print("  pip3 install warrant\n")
    exit(1)

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class RagChatStreamBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const agentsTable = new dynamodb.Table(this, 'AgentsTable', {
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'agentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For MVP - change for production
    });

    const knowledgeSpacesTable = new dynamodb.Table(this, 'KnowledgeSpacesTable', {
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'knowledgeSpaceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For MVP - change for production
    });

    const conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For MVP - change for production
    });

    const ragApiKeyValue = process.env.RAG_STREAM_API_KEY
      || process.env.EXPECTED_API_KEY
      || process.env.TEST_API_KEY;
    if (!ragApiKeyValue || ragApiKeyValue.length < 20) {
      throw new Error('RAG_STREAM_API_KEY (or EXPECTED_API_KEY) must be set and at least 20 characters long for Lambda/API authentication.');
    }

    // Environment variables for Lambda functions
    const lambdaEnvironment = {
      AGENTS_TABLE_NAME: agentsTable.tableName,
      KNOWLEDGE_SPACES_TABLE_NAME: knowledgeSpacesTable.tableName,
      CONVERSATIONS_TABLE_NAME: conversationsTable.tableName,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      QDRANT_URL: process.env.QDRANT_URL || '',
      QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
      EMBEDDING_MODEL: 'text-embedding-3-small',
      LLM_MODEL: 'gpt-4o',
      LOG_LEVEL: 'INFO',
      SIMILARITY_THRESHOLD: '0.35',
      TOP_K: '8',
      MAX_CITED_URLS: '3',
      EXPECTED_API_KEY: ragApiKeyValue, // For API Gateway authorizer
      TAUVS_API_KEY: ragApiKeyValue,    // For bearer auth validation
      RAG_STREAM_API_KEY: ragApiKeyValue,
    };

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions
    agentsTable.grantReadWriteData(lambdaRole);
    knowledgeSpacesTable.grantReadWriteData(lambdaRole);
    conversationsTable.grantReadWriteData(lambdaRole);

    // Create Lambda deployment package with dependencies
    // Copy dist and production node_modules to lambda-dist folder
    const lambdaAssetPath = 'lambda-dist';

    // Lambda Functions
    const knowledgeCreateLambda = new lambda.Function(this, 'KnowledgeCreateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/knowledgeCreate.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    const knowledgeListLambda = new lambda.Function(this, 'KnowledgeListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/knowledgeList.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const knowledgeChunksLambda = new lambda.Function(this, 'KnowledgeChunksFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/knowledgeChunks.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const agentCreateLambda = new lambda.Function(this, 'AgentCreateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/agentCreate.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const agentUpdateLambda = new lambda.Function(this, 'AgentUpdateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/agent-update.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const agentDeleteLambda = new lambda.Function(this, 'AgentDeleteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/agent-delete.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const knowledgeDeleteLambda = new lambda.Function(this, 'KnowledgeDeleteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/knowledge-delete.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const chatLambda = new lambda.Function(this, 'ChatFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/chat.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
    });

    const chatStreamLambda = new lambda.Function(this, 'ChatStreamFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/chatCompletionsStreamHandler.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(180), // 3 minutes for streaming
      memorySize: 1024,
    });

    // API Key Authorizer Lambda Function
    const apiKeyAuthorizerLambda = new lambda.Function(this, 'ApiKeyAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/apiKeyAuthorizer.handler',
      code: lambda.Code.fromAsset(lambdaAssetPath),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      role: new iam.Role(this, 'ApiKeyAuthorizerRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
      }),
    });

    // Cognito User Pool
    // Check if we should use an existing User Pool or create a new one
    let userPool: cognito.IUserPool;
    
    if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_USER_POOL_ID !== 'CREATE_NEW') {
      // Use existing User Pool
      userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', process.env.COGNITO_USER_POOL_ID);
    } else {
      // Create new User Pool with custom:tenant_id attribute
      userPool = new cognito.UserPool(this, 'UserPool', {
        userPoolName: 'rag-chat-backend-users',
        selfSignUpEnabled: false,
        signInAliases: {
          email: true,
          username: false,
        },
        autoVerify: {
          email: true,
        },
        standardAttributes: {
          email: {
            required: true,
            mutable: true,
          },
        },
        customAttributes: {
          tenant_id: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
        },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: false,
        },
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        removalPolicy: cdk.RemovalPolicy.DESTROY, // For MVP - change for production
      });

      // Create User Pool Client
      const userPoolClient = userPool.addClient('WebClient', {
        authFlows: {
          userPassword: true,
          adminUserPassword: true,
          userSrp: true,
        },
        generateSecret: false, // Set to false for easier testing
      });

      // Output User Pool details
      new cdk.CfnOutput(this, 'UserPoolId', {
        value: userPool.userPoolId,
        description: 'Cognito User Pool ID',
      });

      new cdk.CfnOutput(this, 'UserPoolClientId', {
        value: userPoolClient.userPoolClientId,
        description: 'Cognito User Pool Client ID',
      });
    }

    // API Gateway
    const api = new apigateway.RestApi(this, 'RagChatApi', {
      restApiName: 'RAG Chat Stream Backend API',
      description: 'OpenAI-compatible RAG chat API with streaming support',
      apiKeySourceType: apigateway.ApiKeySourceType.AUTHORIZER,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-Key'],
      },
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, 'ApiAccessLogs', {
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          })
        ),
        accessLogFormat: apigateway.AccessLogFormat.custom(
          JSON.stringify({
            requestId: '$context.requestId',
            ip: '$context.identity.sourceIp',
            userAgent: '$context.identity.userAgent',
            requestTime: '$context.requestTime',
            httpMethod: '$context.httpMethod',
            resourcePath: '$context.resourcePath',
            status: '$context.status',
            protocol: '$context.protocol',
            responseLength: '$context.responseLength',
            error: '$context.error.message',
            integrationStatus: '$context.integrationStatus',
            apiId: '$context.apiId',
            authorizer: '$context.authorizer.principalId',
          })
        ),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
    });

    // Add default gateway responses so that CORS headers are returned on errors (e.g., 4xx/5xx)
    new apigateway.GatewayResponse(this, 'Default4xxWithCors', {
      restApi: api,
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
        'Access-Control-Allow-Headers': '\'*\'',
        'Access-Control-Allow-Methods': '\'*\'',
      },
    });

    new apigateway.GatewayResponse(this, 'Default5xxWithCors', {
      restApi: api,
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
        'Access-Control-Allow-Headers': '\'*\'',
        'Access-Control-Allow-Methods': '\'*\'',
      },
    });

    // Custom API Key Authorizer
    // Authorization header is required for authentication
    // The handler also supports x-api-key as fallback, but API Gateway requires Authorization header
    const apiKeyAuthorizer = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
      handler: apiKeyAuthorizerLambda,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    // API Resources and Methods
    const v1 = api.root.addResource('v1');

    // /v1/knowledge
    const knowledge = v1.addResource('knowledge');

    const knowledgeCreate = knowledge.addResource('create');
    knowledgeCreate.addMethod('POST', new apigateway.LambdaIntegration(knowledgeCreateLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    const knowledgeList = knowledge.addResource('list');
    knowledgeList.addMethod('GET', new apigateway.LambdaIntegration(knowledgeListLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    const knowledgeSpaceIdResource = knowledge.addResource('{knowledgeSpaceId}');
    
    const knowledgeChunks = knowledgeSpaceIdResource.addResource('chunks');
    knowledgeChunks.addMethod('GET', new apigateway.LambdaIntegration(knowledgeChunksLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    // /v1/knowledge/{knowledgeSpaceId} - DELETE
    knowledgeSpaceIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(knowledgeDeleteLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    // /v1/agent
    const agent = v1.addResource('agent');

    const agentCreate = agent.addResource('create');
    agentCreate.addMethod('POST', new apigateway.LambdaIntegration(agentCreateLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    // /v1/agent/{agentId}
    const agentById = agent.addResource('{agentId}');
    agentById.addMethod('PUT', new apigateway.LambdaIntegration(agentUpdateLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });
    agentById.addMethod('DELETE', new apigateway.LambdaIntegration(agentDeleteLambda), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    // /v1/chat
    const chat = v1.addResource('chat');

    const chatCompletions = chat.addResource('completions');
    chatCompletions.addMethod('POST', new apigateway.LambdaIntegration(chatStreamLambda, {
      responseTransferMode: apigateway.ResponseTransferMode.STREAM,
    }), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });
    const chatCompletionsStream = chatCompletions.addResource('stream');
    chatCompletionsStream.addMethod('POST', new apigateway.LambdaIntegration(chatStreamLambda, {
      responseTransferMode: apigateway.ResponseTransferMode.STREAM,
    }), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: apiKeyAuthorizer,
      apiKeyRequired: false,
    });

    // API Key and Usage Plan for external API access
    const apiKeyName = process.env.RAG_STREAM_API_KEY_NAME || `rag-stream-api-key-${cdk.Names.uniqueId(api)}`;
    const apiKey = api.addApiKey('LambdaApiKeyV3', {
      apiKeyName,
      description: 'API Key for Lambda endpoint access',
      // value: ragApiKeyValue, // コメントアウト：自動生成させる
    });

    const usagePlan = api.addUsagePlan('LambdaUsagePlan', {
      name: 'Lambda API Usage Plan',
      description: 'Usage plan for Lambda API key access',
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // CloudWatch Alarms

    // Lambda Error Rate Alarm (> 5%)
    const lambdaFunctions = [
      knowledgeCreateLambda,
      knowledgeListLambda,
      agentCreateLambda,
      chatLambda,
      chatStreamLambda,
    ];

    lambdaFunctions.forEach((lambdaFunction) => {
      const errorMetric = lambdaFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const invocationMetric = lambdaFunction.metricInvocations({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const errorRateMetric = new cloudwatch.MathExpression({
        expression: 'IF(invocations > 0, (errors / invocations) * 100, 0)',
        usingMetrics: {
          errors: errorMetric,
          invocations: invocationMetric,
        },
        period: cdk.Duration.minutes(5),
      });

      new cloudwatch.Alarm(this, `${lambdaFunction.node.id}ErrorRateAlarm`, {
        metric: errorRateMetric,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Lambda error rate exceeded 5% for ${lambdaFunction.node.id}`,
        alarmName: `Stream-${lambdaFunction.node.id}-ErrorRate-High`,
      });

      // High Latency Alarm (p99 > threshold)
      const durationMetric = lambdaFunction.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p99',
      });

      const latencyThreshold = lambdaFunction === chatStreamLambda ? 30000 : 5000; // 30s for streaming, 5s for others

      new cloudwatch.Alarm(this, `${lambdaFunction.node.id}HighLatencyAlarm`, {
        metric: durationMetric,
        threshold: latencyThreshold,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Lambda p99 latency exceeded ${latencyThreshold}ms for ${lambdaFunction.node.id}`,
        alarmName: `Stream-${lambdaFunction.node.id}-Latency-High`,
      });
    });

    // API Gateway 5xx Error Rate Alarm (> 1%)
    const api5xxMetric = api.metricServerError({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const apiCountMetric = api.metricCount({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const api5xxRateMetric = new cloudwatch.MathExpression({
      expression: 'IF(requests > 0, (errors / requests) * 100, 0)',
      usingMetrics: {
        errors: api5xxMetric,
        requests: apiCountMetric,
      },
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'ApiGateway5xxErrorRateAlarm', {
      metric: api5xxRateMetric,
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5xx error rate exceeded 1%',
      alarmName: 'Stream-ApiGateway-5xxErrorRate-High',
    });

    // DynamoDB Throttling Alarms
    const dynamodbTables = [
      { table: agentsTable, name: 'AgentsTable' },
      { table: knowledgeSpacesTable, name: 'KnowledgeSpacesTable' },
      { table: conversationsTable, name: 'ConversationsTable' },
    ];

    dynamodbTables.forEach(({ table, name }) => {
      // Monitor read throttling
      const readThrottleMetric = table.metricThrottledRequestsForOperation('GetItem', {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      new cloudwatch.Alarm(this, `${name}ReadThrottleAlarm`, {
        metric: readThrottleMetric,
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `DynamoDB read throttling detected on ${name}`,
        alarmName: `Stream-${name}-ReadThrottling`,
      });

      // Monitor write throttling
      const writeThrottleMetric = table.metricThrottledRequestsForOperation('PutItem', {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      new cloudwatch.Alarm(this, `${name}WriteThrottleAlarm`, {
        metric: writeThrottleMetric,
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `DynamoDB write throttling detected on ${name}`,
        alarmName: `Stream-${name}-WriteThrottling`,
      });

      // Monitor query throttling
      const queryThrottleMetric = table.metricThrottledRequestsForOperation('Query', {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      new cloudwatch.Alarm(this, `${name}QueryThrottleAlarm`, {
        metric: queryThrottleMetric,
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `DynamoDB query throttling detected on ${name}`,
        alarmName: `Stream-${name}-QueryThrottling`,
      });
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'AgentsTableName', {
      value: agentsTable.tableName,
      description: 'DynamoDB Agents Table Name',
    });

    new cdk.CfnOutput(this, 'KnowledgeSpacesTableName', {
      value: knowledgeSpacesTable.tableName,
      description: 'DynamoDB KnowledgeSpaces Table Name',
    });

    new cdk.CfnOutput(this, 'ConversationsTableName', {
      value: conversationsTable.tableName,
      description: 'DynamoDB Conversations Table Name',
    });

    // new cdk.CfnOutput(this, 'RagStreamApiKeyValue', {
    //   value: ragApiKeyValue,
    //   description: 'API Key value for Lambda authentication (from RAG_STREAM_API_KEY env var)',
    // });
  }
}

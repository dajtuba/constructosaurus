import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class ServerlessApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'ApiTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Lambda Function
    const apiHandler = new NodejsFunction(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    table.grantReadWriteData(apiHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ServerlessApi', {
      restApiName: 'Serverless API'
    });

    const integration = new apigateway.LambdaIntegration(apiHandler);
    api.root.addProxy({ defaultIntegration: integration });
  }
}

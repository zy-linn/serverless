'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const BbPromise = require('bluebird');
const _ = require('lodash');
const childProcess = BbPromise.promisifyAll(require('child_process'));
const AwsCompileApigEvents = require('../../../../../../../../../../../lib/plugins/aws/package/compile/events/api-gateway');
const Serverless = require('../../../../../../../../../../../lib/serverless');
const AwsProvider = require('../../../../../../../../../../../lib/plugins/aws/provider');
const { createTmpDir } = require('../../../../../../../../../../utils/fs');
const runServerless = require('../../../../../../../../../../utils/run-serverless');

describe('#compileStage()', () => {
  let serverless;
  let provider;
  let awsCompileApigEvents;
  let stage;
  let stageLogicalId;
  let logGroupLogicalId;

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    serverless = new Serverless({ commands: [], options: {} });
    provider = new AwsProvider(serverless, options);
    serverless.setProvider('aws', provider);
    serverless.service.service = 'my-service';
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {},
      Outputs: {},
    };
    serverless.serviceDir = createTmpDir();
    serverless.cli = { log: () => {} };
    awsCompileApigEvents = new AwsCompileApigEvents(serverless, options);
    awsCompileApigEvents.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi';
    awsCompileApigEvents.apiGatewayDeploymentLogicalId = 'ApiGatewayDeploymentTest';
    awsCompileApigEvents.provider = provider;
    stage = awsCompileApigEvents.provider.getStage();
    stageLogicalId = awsCompileApigEvents.provider.naming.getStageLogicalId();
    logGroupLogicalId = awsCompileApigEvents.provider.naming.getApiGatewayLogGroupLogicalId();
    // mocking the result of a Deployment resource since we remove the stage name
    // when using the Stage resource
    awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources[
      awsCompileApigEvents.apiGatewayDeploymentLogicalId
    ] = {
      Properties: {
        StageName: stage,
      },
    };
  });

  describe('tracing', () => {
    beforeEach(() => {
      // setting up AWS X-Ray tracing
      awsCompileApigEvents.serverless.service.provider.tracing = {
        apiGateway: true,
      };
    });

    it.skip('should create a dedicated stage resource if tracing is configured', () =>
      awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(resources[stageLogicalId]).to.deep.equal({
          Type: 'AWS::ApiGateway::Stage',
          Properties: {
            RestApiId: {
              Ref: awsCompileApigEvents.apiGatewayRestApiLogicalId,
            },
            DeploymentId: {
              Ref: awsCompileApigEvents.apiGatewayDeploymentLogicalId,
            },
            StageName: 'dev',
            Tags: [],
            TracingEnabled: true,
          },
        });

        expect(resources[awsCompileApigEvents.apiGatewayDeploymentLogicalId]).to.deep.equal({
          Properties: {},
        });
      }));

    it('should NOT create a dedicated stage resource if tracing is not enabled', () => {
      awsCompileApigEvents.serverless.service.provider.tracing = {};

      return awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        // eslint-disable-next-line
        expect(resources[stageLogicalId]).not.to.exist;

        expect(resources[awsCompileApigEvents.apiGatewayDeploymentLogicalId]).to.deep.equal({
          Properties: {
            StageName: stage,
          },
        });
      });
    });
  });

  describe('tags', () => {
    it.skip('should create a dedicated stage resource if provider.stackTags is configured', () => {
      awsCompileApigEvents.serverless.service.provider.stackTags = {
        foo: '1',
      };

      awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;
        expect(resources[awsCompileApigEvents.apiGatewayDeploymentLogicalId]).to.deep.equal({
          Properties: {},
        });

        expect(resources[stageLogicalId]).to.deep.equal({
          Type: 'AWS::ApiGateway::Stage',
          Properties: {
            RestApiId: {
              Ref: awsCompileApigEvents.apiGatewayRestApiLogicalId,
            },
            DeploymentId: {
              Ref: awsCompileApigEvents.apiGatewayDeploymentLogicalId,
            },
            StageName: stage,
            TracingEnabled: false,
            Tags: [{ Key: 'foo', Value: '1' }],
          },
        });
      });
    });

    it.skip('should create a dedicated stage resource if provider.tags is configured', () => {
      awsCompileApigEvents.serverless.service.provider.tags = {
        foo: '1',
      };

      awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;
        expect(resources[awsCompileApigEvents.apiGatewayDeploymentLogicalId]).to.deep.equal({
          Properties: {},
        });

        expect(resources[stageLogicalId]).to.deep.equal({
          Type: 'AWS::ApiGateway::Stage',
          Properties: {
            RestApiId: {
              Ref: awsCompileApigEvents.apiGatewayRestApiLogicalId,
            },
            DeploymentId: {
              Ref: awsCompileApigEvents.apiGatewayDeploymentLogicalId,
            },
            StageName: stage,
            TracingEnabled: false,
            Tags: [{ Key: 'foo', Value: '1' }],
          },
        });
      });
    });

    it.skip('should override provider.stackTags by provider.tags', () => {
      awsCompileApigEvents.serverless.service.provider.stackTags = {
        foo: 'from-stackTags',
        bar: 'from-stackTags',
      };
      awsCompileApigEvents.serverless.service.provider.tags = {
        foo: 'from-tags',
        buz: 'from-tags',
      };

      awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(resources[stageLogicalId]).to.deep.equal({
          Type: 'AWS::ApiGateway::Stage',
          Properties: {
            RestApiId: {
              Ref: awsCompileApigEvents.apiGatewayRestApiLogicalId,
            },
            DeploymentId: {
              Ref: awsCompileApigEvents.apiGatewayDeploymentLogicalId,
            },
            StageName: stage,
            TracingEnabled: false,
            Tags: [
              { Key: 'foo', Value: 'from-tags' },
              { Key: 'bar', Value: 'from-stackTags' },
              { Key: 'buz', Value: 'from-tags' },
            ],
          },
        });
      });
    });
  });

  describe('logs', () => {
    before(() => sinon.stub(childProcess, 'execAsync'));
    after(() => childProcess.execAsync.restore());
    beforeEach(() => {
      // setting up API Gateway logs
      awsCompileApigEvents.serverless.service.provider.logs = {
        restApi: true,
      };
    });

    it.skip('should create a dedicated stage resource if logs are configured', () =>
      awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(resources[stageLogicalId]).to.deep.equal({
          Type: 'AWS::ApiGateway::Stage',
          Properties: {
            RestApiId: {
              Ref: awsCompileApigEvents.apiGatewayRestApiLogicalId,
            },
            DeploymentId: {
              Ref: awsCompileApigEvents.apiGatewayDeploymentLogicalId,
            },
            StageName: 'dev',
            Tags: [],
            TracingEnabled: false,
            MethodSettings: [
              {
                DataTraceEnabled: true,
                HttpMethod: '*',
                LoggingLevel: 'INFO',
                ResourcePath: '/*',
              },
            ],
            AccessLogSetting: {
              DestinationArn: {
                'Fn::GetAtt': [logGroupLogicalId, 'Arn'],
              },
              // eslint-disable-next-line
              Format:
                'requestId: $context.requestId, ip: $context.identity.sourceIp, caller: $context.identity.caller, user: $context.identity.user, requestTime: $context.requestTime, httpMethod: $context.httpMethod, resourcePath: $context.resourcePath, status: $context.status, protocol: $context.protocol, responseLength: $context.responseLength',
            },
          },
        });

        expect(resources[awsCompileApigEvents.apiGatewayDeploymentLogicalId]).to.deep.equal({
          Properties: {},
        });
      }));

    it('should create a Log Group resource', () => {
      return awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(resources[logGroupLogicalId]).to.deep.equal({
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: '/aws/api-gateway/my-service-dev',
          },
        });
      });
    });

    it('should set log retention if provider.logRetentionInDays is set', () => {
      serverless.service.provider.logRetentionInDays = 30;

      return awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(resources[logGroupLogicalId]).to.deep.equal({
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: '/aws/api-gateway/my-service-dev',
            RetentionInDays: serverless.service.provider.logRetentionInDays,
          },
        });
      });
    });

    it('should ensure CloudWatch role custom resource', () => {
      return awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(
          _.isObject(
            resources[
              awsCompileApigEvents.provider.naming.getCustomResourceApiGatewayAccountCloudWatchRoleResourceLogicalId()
            ]
          )
        ).to.equal(true);
      });
    });

    it('should skip CloudWatch role custom resource when restApi.roleManagedExternally is set', () => {
      awsCompileApigEvents.serverless.service.provider.logs.restApi = {
        roleManagedExternally: true,
      };

      return awsCompileApigEvents.compileStage().then(() => {
        const resources =
          awsCompileApigEvents.serverless.service.provider.compiledCloudFormationTemplate.Resources;

        expect(
          _.isObject(
            resources[
              awsCompileApigEvents.provider.naming.getCustomResourceApiGatewayAccountCloudWatchRoleResourceLogicalId()
            ]
          )
        ).to.equal(false);
      });
    });
  });
});

describe('test/unit/lib/plugins/aws/package/compile/events/apiGateway/lib/stage/index.test.js', () => {
  it('should not create LogGroup if `accessLogging` set to false', async () => {
    const { cfTemplate, awsNaming } = await runServerless({
      fixture: 'api-gateway',
      command: 'package',
      configExt: {
        provider: {
          logs: {
            restApi: {
              accessLogging: false,
            },
          },
        },
      },
    });

    expect(cfTemplate.Resources[awsNaming.getApiGatewayLogGroupLogicalId()]).to.be.undefined;
  });

  it('should create LogGroup with `logs.restApi` set to `true`', async () => {
    const { cfTemplate, awsNaming, serverless } = await runServerless({
      fixture: 'api-gateway',
      command: 'package',
      configExt: {
        provider: {
          logs: {
            restApi: true,
          },
        },
      },
    });

    expect(cfTemplate.Resources[awsNaming.getApiGatewayLogGroupLogicalId()]).to.deep.equal({
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: `/aws/api-gateway/${serverless.service.service}-dev`,
      },
    });
  });

  it('should create LogGroup with default setting for `accessLogging`', async () => {
    const { cfTemplate, awsNaming, serverless } = await runServerless({
      fixture: 'api-gateway',
      command: 'package',
      configExt: {
        provider: {
          logs: {
            restApi: {
              executionLogging: false,
            },
          },
        },
      },
    });

    expect(cfTemplate.Resources[awsNaming.getApiGatewayLogGroupLogicalId()]).to.deep.equal({
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: `/aws/api-gateway/${serverless.service.service}-dev`,
      },
    });
  });

  it('should set DataProtectionPolicy if provider.logDataProtectionPolicy is set', async () => {
    const policy = {
      Name: 'data-protection-policy',
      Version: '2021-06-01',
      Statement: [],
    };
    const { cfTemplate, awsNaming, serverless } = await runServerless({
      fixture: 'api-gateway',
      command: 'package',
      configExt: {
        provider: {
          logs: {
            restApi: true,
          },
          logDataProtectionPolicy: policy,
        },
      },
    });

    expect(cfTemplate.Resources[awsNaming.getApiGatewayLogGroupLogicalId()]).to.deep.equal({
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: `/aws/api-gateway/${serverless.service.service}-dev`,
        DataProtectionPolicy: policy,
      },
    });
  });

  it('should use stage name from provider if provider.apiGateway.stage is configured', async () => {
    // https://github.com/serverless/serverless/issues/11675
    const { cfTemplate, awsNaming } = await runServerless({
      fixture: 'api-gateway',
      command: 'package',
      configExt: {
        provider: {
          apiGateway: {
            stage: 'foo',
          },
        },
      },
    });
    expect(awsNaming.provider.getApiGatewayStage()).to.equal('foo');
    const [apiGatewayDeploymentKey] = Object.keys(cfTemplate.Resources).filter((k) =>
      k.startsWith('ApiGatewayDeployment')
    );
    const apiGatewayDeployment = cfTemplate.Resources[apiGatewayDeploymentKey];
    expect(apiGatewayDeployment.Properties.StageName).to.equal('foo');
  });
});

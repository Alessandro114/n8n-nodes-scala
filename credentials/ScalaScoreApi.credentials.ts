import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ScalaScoreApi implements ICredentialType {
	name = 'scalaScoreApi';
	displayName = 'S.C.A.L.A. Score API';
	documentationUrl = 'https://score.get-scala.com/api/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Score API key (sent as X-API-Key). Free key, 50 calls/month: https://score.get-scala.com/api/free-key',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://score.get-scala.com',
			description: 'Score host, without /api/v1 (change only for a self-hosted or proxied instance)',
		},
	];

	// /api/v1/usage does not consume credits
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{($credentials.baseUrl || "https://score.get-scala.com").replace(/\\/+$/, "").replace(/\\/api\\/v1$/, "")}}',
			url: '/api/v1/usage',
			headers: { 'X-API-Key': '={{$credentials.apiKey}}' },
		},
	};
}

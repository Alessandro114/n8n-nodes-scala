import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ScalaScoreApi implements ICredentialType {
	name = 'scalaScoreApi';
	displayName = 'S.C.A.L.A. Score API';
	documentationUrl = 'https://get-scala.com/score/api/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Score API key from app.get-scala.com/score/api',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.get-scala.com',
			description: 'API base URL (change only for self-hosted instances)',
		},
	];
}

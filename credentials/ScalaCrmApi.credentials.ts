import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ScalaCrmApi implements ICredentialType {
	name = 'scalaCrmApi';
	displayName = 'S.C.A.L.A. CRM API';
	documentationUrl = 'https://get-scala.com/api/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your tenant API token from app.get-scala.com/settings/api',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.get-scala.com',
			description: 'API base URL',
		},
	];
}

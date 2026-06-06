import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

export class ScalaScore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'S.C.A.L.A. Score',
		name: 'scalaScore',
		icon: 'file:scala.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Search 244M+ companies worldwide — financial data, risk scores, industry classification',
		defaults: {
			name: 'SCALA Score',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'scalaScoreApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Search Companies',
						value: 'search',
						description: 'Search companies by name, VAT, or keyword',
						action: 'Search companies',
					},
					{
						name: 'Lookup Company',
						value: 'lookup',
						description: 'Get detailed company data by ID or VAT number',
						action: 'Lookup company',
					},
					{
						name: 'Generate Report',
						value: 'report',
						description: 'Generate a full company health report (PDF)',
						action: 'Generate report',
					},
					{
						name: 'Get Countries',
						value: 'countries',
						description: 'List all available countries with company counts',
						action: 'Get countries',
					},
					{
						name: 'Get Stats',
						value: 'stats',
						description: 'Get database statistics (total companies, countries, etc.)',
						action: 'Get stats',
					},
					{
						name: 'Check Credits',
						value: 'credits',
						description: 'Check remaining API credits',
						action: 'Check credits',
					},
				],
				default: 'search',
			},
			// Search parameters
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Company name, VAT number, or keyword to search',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'ISO 2-letter country code (e.g. IT, DE, FR, US, GB)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'NACE Code',
				name: 'nace',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Filter by NACE industry code (e.g. 56.10 for restaurants)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Active', value: 'active' },
					{ name: 'Inactive', value: 'inactive' },
				],
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Filter by company status',
			},
			// Lookup parameters
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['lookup'],
					},
				},
				description: 'Company ID or VAT number',
			},
			// Report parameters
			{
				displayName: 'Company ID',
				name: 'reportCompanyId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['report'],
					},
				},
				description: 'Company ID to generate report for',
			},
			{
				displayName: 'Report Type',
				name: 'reportType',
				type: 'options',
				options: [
					{ name: 'Basic (5 credits)', value: 'basic' },
					{ name: 'Pro (10 credits)', value: 'pro' },
					{ name: 'Enterprise (20 credits)', value: 'enterprise' },
				],
				default: 'basic',
				displayOptions: {
					show: {
						operation: ['report'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('scalaScoreApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			let endpoint = '';
			let method = 'GET';
			let body: Record<string, unknown> | undefined;
			const qs: Record<string, string> = {};

			switch (operation) {
				case 'search': {
					endpoint = '/api/score/search';
					qs.q = this.getNodeParameter('query', i) as string;
					const country = this.getNodeParameter('country', i, '') as string;
					if (country) qs.country = country;
					const limit = this.getNodeParameter('limit', i, 10) as number;
					qs.limit = String(limit);
					const nace = this.getNodeParameter('nace', i, '') as string;
					if (nace) qs.nace = nace;
					const status = this.getNodeParameter('status', i, '') as string;
					if (status) qs.status = status;
					break;
				}
				case 'lookup': {
					endpoint = '/api/score/lookup';
					qs.id = this.getNodeParameter('companyId', i) as string;
					break;
				}
				case 'report': {
					endpoint = '/api/score/report';
					method = 'POST';
					body = {
						company_id: this.getNodeParameter('reportCompanyId', i) as string,
						type: this.getNodeParameter('reportType', i) as string,
					};
					break;
				}
				case 'countries': {
					endpoint = '/api/score/countries';
					break;
				}
				case 'stats': {
					endpoint = '/api/score/stats';
					break;
				}
				case 'credits': {
					endpoint = '/api/score/credits';
					break;
				}
			}

			const queryString = Object.entries(qs).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
			const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

			const options: Record<string, unknown> = {
				method,
				url,
				headers: {
					'X-API-Key': credentials.apiKey as string,
					'Content-Type': 'application/json',
				},
				json: true,
			};

			if (body) {
				options.body = body;
			}

			const response = await this.helpers.request(options);
			const responseData = typeof response === 'string' ? JSON.parse(response) : response;

			if (Array.isArray(responseData.results || responseData.companies || responseData.data)) {
				const arr = responseData.results || responseData.companies || responseData.data;
				for (const item of arr) {
					returnData.push({ json: item });
				}
			} else {
				returnData.push({ json: responseData });
			}
		}

		return [returnData];
	}
}

import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

const DEFAULT_BASE_URL = 'https://score.get-scala.com';

// Accepts the host ("https://score.get-scala.com") or a full v1 URL. The pre-0.2.0 default
// (app.get-scala.com) never served /api/v1, so saved credentials still holding it are mapped
// to the Score host instead of failing with 404.
export function resolveBaseUrl(raw: unknown): string {
	let url = String(raw || DEFAULT_BASE_URL).trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
	if (/^https?:\/\/app\.get-scala\.com$/i.test(url)) url = DEFAULT_BASE_URL;
	return url;
}

export class ScalaScore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'S.C.A.L.A. Score',
		name: 'scalaScore',
		icon: 'file:scala.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Company search and profiles from the S.C.A.L.A. Score API v1. Filed financials only for FR, NO, LT, EE, LV, CO.',
		defaults: {
			name: 'SCALA Score',
		},
		inputs: ['main' as const],
		outputs: ['main' as const],
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
						description: 'Search by name (prefix match) or tax/VAT id. 1 credit per call.',
						action: 'Search companies',
					},
					{
						name: 'Lookup Company',
						value: 'lookup',
						description: 'Full profile for a company id returned by search. 1 credit per call.',
						action: 'Lookup company',
					},
					{
						name: 'Get Countries',
						value: 'countries',
						description: 'Countries available in the database. 1 credit per call.',
						action: 'Get countries',
					},
					{
						name: 'Check Credits',
						value: 'credits',
						description: 'Plan, credits used and remaining for this key. Free.',
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
				displayOptions: { show: { operation: ['search'] } },
				description: 'Company name (prefix match) or VAT number such as IT00159560366. Leave empty if you use Tax ID.',
			},
			{
				displayName: 'Tax ID',
				name: 'taxId',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['search'] } },
				description: 'Exact tax/VAT id. The country prefix (e.g. IT) selects the country if Country is empty.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['search'] } },
				description: 'ISO 2-letter country code (e.g. IT, DE, FR, GB). Empty = all countries.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1, maxValue: 100 },
				displayOptions: { show: { operation: ['search'] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filed Accounts Only',
				name: 'filedOnly',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['search'] } },
				description:
					'Whether to return only companies with revenue_type "reported" (filed accounts). Paid credit packs only; free keys get HTTP 403.',
			},
			// Lookup parameters
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['lookup'] } },
				description: 'The id field of a search result',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('scalaScoreApi');
		const baseUrl = resolveBaseUrl(credentials.baseUrl);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let path = '';
				const qs: IDataObject = {};

				switch (operation) {
					case 'search': {
						path = '/api/v1/search';
						const query = (this.getNodeParameter('query', i, '') as string).trim();
						const taxId = (this.getNodeParameter('taxId', i, '') as string).trim();
						if (!query && !taxId) {
							throw new Error('Set Query or Tax ID');
						}
						if (taxId) qs.tax_id = taxId;
						else qs.q = query;
						const country = (this.getNodeParameter('country', i, '') as string).trim();
						if (country) qs.country = country;
						qs.limit = this.getNodeParameter('limit', i, 10) as number;
						if (this.getNodeParameter('filedOnly', i, false) as boolean) qs.filed_only = '1';
						break;
					}
					case 'lookup': {
						const id = (this.getNodeParameter('companyId', i) as string).trim();
						if (!id) throw new Error('Company ID is required');
						path = `/api/v1/company/${encodeURIComponent(id)}`;
						break;
					}
					case 'countries':
						path = '/api/v1/countries';
						break;
					case 'credits':
						path = '/api/v1/usage';
						break;
					default:
						throw new Error(`Unknown operation: ${operation}`);
				}

				const response = (await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}${path}`,
					qs,
					headers: { 'X-API-Key': credentials.apiKey as string },
					json: true,
				})) as IDataObject;

				const push = (json: IDataObject) =>
					returnData.push({ json, pairedItem: { item: i } });

				if (operation === 'search') {
					// Keep licence attribution with every record (required when redistributing the data).
					const shared: IDataObject = {};
					if (response.data_licences) shared.data_licences = response.data_licences;
					if (response.attribution) shared.attribution = response.attribution;
					const results = (response.results as IDataObject[]) || [];
					if (results.length === 0) continue;
					for (const r of results) push({ ...r, ...shared });
				} else if (operation === 'lookup') {
					const { company, ...rest } = response;
					push({ ...(company as IDataObject), ...rest });
				} else if (operation === 'countries') {
					const countries = (response.countries as IDataObject[]) || [];
					for (const c of countries) push(c);
				} else {
					push(response);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if ((error as { httpCode?: string }).httpCode || (error as { response?: unknown }).response) {
					throw new NodeApiError(this.getNode(), error as never, { itemIndex: i });
				}
				throw error;
			}
		}

		return [returnData];
	}
}

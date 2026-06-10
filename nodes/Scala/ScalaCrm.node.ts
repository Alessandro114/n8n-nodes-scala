import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,

} from 'n8n-workflow';

export class ScalaCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'S.C.A.L.A. CRM',
		name: 'scalaCrm',
		icon: 'file:scala.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage contacts, pipeline, tickets, and WhatsApp conversations in S.C.A.L.A. AI OS',
		defaults: {
			name: 'SCALA CRM',
		},
		inputs: ['main' as const],
		outputs: ['main' as const],
		credentials: [
			{
				name: 'scalaCrmApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Pipeline', value: 'pipeline' },
					{ name: 'Ticket', value: 'ticket' },
					{ name: 'Data Table', value: 'data' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'contact',
			},
			// Contact operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{ name: 'Get All', value: 'getAll', action: 'Get all contacts' },
					{ name: 'Create', value: 'create', action: 'Create a contact' },
					{ name: 'Update', value: 'update', action: 'Update a contact' },
					{ name: 'Delete', value: 'delete', action: 'Delete a contact' },
					{ name: 'Get Timeline', value: 'timeline', action: 'Get contact timeline' },
					{ name: 'Send Email', value: 'email', action: 'Send email to contact' },
				],
				default: 'getAll',
			},
			// Pipeline operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pipeline'] } },
				options: [
					{ name: 'Get Pipeline', value: 'get', action: 'Get pipeline stages' },
					{ name: 'Get Kanban', value: 'kanban', action: 'Get kanban view' },
				],
				default: 'get',
			},
			// Ticket operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['ticket'] } },
				options: [
					{ name: 'Get All', value: 'getAll', action: 'Get all tickets' },
					{ name: 'Create', value: 'create', action: 'Create a ticket' },
					{ name: 'Update', value: 'update', action: 'Update a ticket' },
				],
				default: 'getAll',
			},
			// Data table operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['data'] } },
				options: [
					{ name: 'Get Records', value: 'getAll', action: 'Get records from table' },
					{ name: 'Create Record', value: 'create', action: 'Create a record' },
					{ name: 'Update Record', value: 'update', action: 'Update a record' },
					{ name: 'Delete Record', value: 'delete', action: 'Delete a record' },
				],
				default: 'getAll',
			},
			// Webhook operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{ name: 'Get All', value: 'getAll', action: 'Get all webhooks' },
					{ name: 'Create', value: 'create', action: 'Create a webhook' },
					{ name: 'Delete', value: 'delete', action: 'Delete a webhook' },
					{ name: 'Test', value: 'test', action: 'Test a webhook' },
				],
				default: 'getAll',
			},
			// Contact fields
			{
				displayName: 'Contact Name',
				name: 'contactName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Email',
				name: 'contactEmail',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Phone',
				name: 'contactPhone',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Company',
				name: 'contactCompany',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Pipeline Stage',
				name: 'contactStage',
				type: 'options',
				options: [
					{ name: 'Lead', value: 'lead' },
					{ name: 'Contacted', value: 'contacted' },
					{ name: 'Qualified', value: 'qualified' },
					{ name: 'Proposal', value: 'proposal' },
					{ name: 'Negotiation', value: 'negotiation' },
					{ name: 'Won', value: 'won' },
					{ name: 'Lost', value: 'lost' },
				],
				default: 'lead',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Tags',
				name: 'contactTags',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
				description: 'Comma-separated tags',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['contact'], operation: ['create', 'update'] } },
				description: 'Additional fields as JSON object',
			},
			// Contact ID for update/delete/timeline
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['update', 'delete', 'timeline'] } },
			},
			// Email fields
			{
				displayName: 'Contact ID',
				name: 'emailContactId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['email'] } },
			},
			{
				displayName: 'Subject',
				name: 'emailSubject',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['email'] } },
			},
			{
				displayName: 'Body',
				name: 'emailBody',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['email'] } },
			},
			// Data table fields
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: 'contacts',
				required: true,
				displayOptions: { show: { resource: ['data'] } },
				description: 'Database table name (e.g. contacts, tickets, assets, invoices)',
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['data'], operation: ['update', 'delete'] } },
			},
			{
				displayName: 'Record Data',
				name: 'recordData',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['data'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Limit',
				name: 'dataLimit',
				type: 'number',
				default: 50,
				displayOptions: { show: { resource: ['data'], operation: ['getAll'] } },
			},
			// Webhook fields
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
			},
			{
				displayName: 'Events',
				name: 'webhookEvents',
				type: 'multiOptions',
				options: [
					{ name: 'Contact Created', value: 'contact.created' },
					{ name: 'Contact Updated', value: 'contact.updated' },
					{ name: 'Ticket Created', value: 'ticket.created' },
					{ name: 'WhatsApp Message', value: 'whatsapp.message' },
					{ name: 'Order Created', value: 'order.created' },
					{ name: 'Invoice Created', value: 'invoice.created' },
				],
				default: ['contact.created'],
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
			},
			{
				displayName: 'Webhook ID',
				name: 'webhookId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['webhook'], operation: ['delete', 'test'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('scalaCrmApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
		const headers: Record<string, string> = {
			'Authorization': `Bearer ${credentials.apiToken}`,
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			let url = '';
			let method = 'GET';
			let body: Record<string, unknown> | undefined;

			if (resource === 'contact') {
				switch (operation) {
					case 'getAll':
						url = `${baseUrl}/api/crm/contacts`;
						break;
					case 'create': {
						url = `${baseUrl}/api/crm/contacts`;
						method = 'POST';
						const additional = JSON.parse(this.getNodeParameter('additionalFields', i, '{}') as string);
						body = {
							name: this.getNodeParameter('contactName', i) as string,
							email: this.getNodeParameter('contactEmail', i, '') as string,
							phone: this.getNodeParameter('contactPhone', i, '') as string,
							company: this.getNodeParameter('contactCompany', i, '') as string,
							pipeline_stage: this.getNodeParameter('contactStage', i, 'lead') as string,
							tags: (this.getNodeParameter('contactTags', i, '') as string).split(',').map(t => t.trim()).filter(Boolean),
							...additional,
						};
						break;
					}
					case 'update': {
						const id = this.getNodeParameter('contactId', i) as string;
						url = `${baseUrl}/api/crm/contacts/${id}`;
						method = 'PUT';
						body = JSON.parse(this.getNodeParameter('additionalFields', i, '{}') as string);
						break;
					}
					case 'delete': {
						const id = this.getNodeParameter('contactId', i) as string;
						url = `${baseUrl}/api/crm/contacts/${id}`;
						method = 'DELETE';
						break;
					}
					case 'timeline': {
						const id = this.getNodeParameter('contactId', i) as string;
						url = `${baseUrl}/api/crm/contacts/${id}/timeline`;
						break;
					}
					case 'email': {
						url = `${baseUrl}/api/crm/email`;
						method = 'POST';
						body = {
							contact_id: this.getNodeParameter('emailContactId', i) as string,
							subject: this.getNodeParameter('emailSubject', i) as string,
							body: this.getNodeParameter('emailBody', i) as string,
						};
						break;
					}
				}
			} else if (resource === 'pipeline') {
				switch (operation) {
					case 'get':
						url = `${baseUrl}/api/crm/pipeline`;
						break;
					case 'kanban':
						url = `${baseUrl}/api/crm/kanban`;
						break;
				}
			} else if (resource === 'ticket') {
				const table = 'tickets';
				switch (operation) {
					case 'getAll':
						url = `${baseUrl}/api/data/${table}`;
						break;
					case 'create':
						url = `${baseUrl}/api/data/${table}`;
						method = 'POST';
						body = JSON.parse(this.getNodeParameter('recordData', i, '{}') as string);
						break;
					case 'update': {
						const id = this.getNodeParameter('recordId', i) as string;
						url = `${baseUrl}/api/data/${table}/${id}`;
						method = 'PUT';
						body = JSON.parse(this.getNodeParameter('recordData', i, '{}') as string);
						break;
					}
				}
			} else if (resource === 'data') {
				const table = this.getNodeParameter('tableName', i) as string;
				switch (operation) {
					case 'getAll': {
						const limit = this.getNodeParameter('dataLimit', i, 50) as number;
						url = `${baseUrl}/api/data/${table}?limit=${limit}`;
						break;
					}
					case 'create':
						url = `${baseUrl}/api/data/${table}`;
						method = 'POST';
						body = JSON.parse(this.getNodeParameter('recordData', i, '{}') as string);
						break;
					case 'update': {
						const id = this.getNodeParameter('recordId', i) as string;
						url = `${baseUrl}/api/data/${table}/${id}`;
						method = 'PUT';
						body = JSON.parse(this.getNodeParameter('recordData', i, '{}') as string);
						break;
					}
					case 'delete': {
						const id = this.getNodeParameter('recordId', i) as string;
						url = `${baseUrl}/api/data/${table}/${id}`;
						method = 'DELETE';
						break;
					}
				}
			} else if (resource === 'webhook') {
				switch (operation) {
					case 'getAll':
						url = `${baseUrl}/api/webhooks`;
						break;
					case 'create':
						url = `${baseUrl}/api/webhooks`;
						method = 'POST';
						body = {
							url: this.getNodeParameter('webhookUrl', i) as string,
							events: this.getNodeParameter('webhookEvents', i) as string[],
						};
						break;
					case 'delete': {
						const id = this.getNodeParameter('webhookId', i) as string;
						url = `${baseUrl}/api/webhooks/${id}`;
						method = 'DELETE';
						break;
					}
					case 'test': {
						const id = this.getNodeParameter('webhookId', i) as string;
						url = `${baseUrl}/api/webhooks/${id}/test`;
						method = 'POST';
						break;
					}
				}
			}

			const options: Record<string, unknown> = { method, url, headers, json: true };
			if (body) options.body = body;

			const response = await this.helpers.request(options);
			const data = typeof response === 'string' ? JSON.parse(response) : response;

			if (Array.isArray(data.data || data.results || data)) {
				const arr = data.data || data.results || data;
				for (const item of arr) {
					returnData.push({ json: item });
				}
			} else {
				returnData.push({ json: data });
			}
		}

		return [returnData];
	}
}

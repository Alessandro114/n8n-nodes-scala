// n8n passa al nodo tutto cio che gli serve attraverso `this`: gli input, le
// credenziali, i parametri e il client HTTP. E gia iniezione di dipendenze,
// quindi execute() si prova per intero costruendo un `this` finto — senza
// n8n, senza rete e senza chiavi.

import { describe, it, expect } from 'vitest';
import { ScalaScore } from '../nodes/Scala/ScalaScore.node';
import { ScalaCrm } from '../nodes/Scala/ScalaCrm.node';
import { ScalaScoreApi } from '../credentials/ScalaScoreApi.credentials';
import { ScalaCrmApi } from '../credentials/ScalaCrmApi.credentials';

interface Richiesta {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    json?: boolean;
}

/** Un contesto n8n finto. Registra le richieste e risponde cio che gli dici. */
function contesto(opts: {
    parametri: Record<string, unknown> | Array<Record<string, unknown>>;
    credenziali?: Record<string, unknown>;
    risposta?: unknown;
    elementi?: number;
}) {
    const viste: Richiesta[] = [];
    const perElemento = Array.isArray(opts.parametri) ? opts.parametri : [opts.parametri];
    const elementi = opts.elementi ?? perElemento.length;
    return {
        viste,
        ctx: {
            getInputData: () => Array.from({ length: elementi }, () => ({ json: {} })),
            getCredentials: async () => opts.credenziali ?? {
                apiKey: 'chiave', apiToken: 'gettone', baseUrl: 'https://app.get-scala.com',
            },
            getNodeParameter: (nome: string, i: number, predefinito?: unknown) => {
                const p = perElemento[Math.min(i, perElemento.length - 1)];
                return nome in p ? p[nome] : predefinito;
            },
            helpers: {
                request: async (o: Richiesta) => {
                    viste.push(o);
                    return opts.risposta ?? {};
                },
            },
        },
    };
}

const esegui = async (nodo: { execute: unknown }, c: ReturnType<typeof contesto>) =>
    (nodo.execute as (this: unknown) => Promise<Array<Array<{ json: unknown }>>>).call(c.ctx);

// ═══════════════════════════ ScalaScore ═══════════════════════════

describe('ScalaScore — costruzione della richiesta', () => {
    it('search mette la query e il limite in coda', async () => {
        const c = contesto({ parametri: { operation: 'search', query: 'Ferrero', limit: 5 } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).toContain('/api/score/search?');
        expect(c.viste[0].url).toContain('q=Ferrero');
        expect(c.viste[0].url).toContain('limit=5');
    });

    it('search omette i filtri lasciati vuoti', async () => {
        const c = contesto({ parametri: { operation: 'search', query: 'x' } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).not.toContain('country=');
        expect(c.viste[0].url).not.toContain('nace=');
        expect(c.viste[0].url).not.toContain('status=');
    });

    it('search include i filtri valorizzati', async () => {
        const c = contesto({
            parametri: { operation: 'search', query: 'x', country: 'IT', nace: '56.10', status: 'active' },
        });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).toContain('country=IT');
        expect(c.viste[0].url).toContain('nace=56.10');
        expect(c.viste[0].url).toContain('status=active');
    });

    it('codifica i valori invece di spezzare l URL', async () => {
        const c = contesto({ parametri: { operation: 'search', query: 'Rossi & Figli' } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).toContain('q=Rossi%20%26%20Figli');
    });

    it('lookup passa l identificativo come id', async () => {
        const c = contesto({ parametri: { operation: 'lookup', companyId: 'IT123' } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).toContain('/api/score/lookup?id=IT123');
    });

    it('report e una POST con il corpo e senza coda', async () => {
        const c = contesto({
            parametri: { operation: 'report', reportCompanyId: 'c1', reportType: 'pro' },
        });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].method).toBe('POST');
        expect(c.viste[0].body).toEqual({ company_id: 'c1', type: 'pro' });
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/score/report');
    });

    it.each([
        ['countries', '/api/score/countries'],
        ['stats', '/api/score/stats'],
        ['credits', '/api/score/credits'],
    ])('%s e una GET senza parametri', async (operation, percorso) => {
        const c = contesto({ parametri: { operation } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].method).toBe('GET');
        expect(c.viste[0].url).toBe(`https://app.get-scala.com${percorso}`);
        expect(c.viste[0].body).toBeUndefined();
    });

    it('manda la chiave nell intestazione e non nell URL', async () => {
        const c = contesto({ parametri: { operation: 'stats' } });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].headers['X-API-Key']).toBe('chiave');
        expect(c.viste[0].url).not.toContain('chiave');
    });

    it('toglie la barra finale dal baseUrl, per non fare un doppio slash', async () => {
        const c = contesto({
            parametri: { operation: 'stats' },
            credenziali: { apiKey: 'k', baseUrl: 'https://esempio.test/' },
        });
        await esegui(new ScalaScore(), c);
        expect(c.viste[0].url).toBe('https://esempio.test/api/score/stats');
    });
});

describe('ScalaScore — lettura della risposta', () => {
    it.each(['results', 'companies', 'data'])(
        'spacchetta l elenco trovato in %s in un elemento per riga',
        async (campo) => {
            const c = contesto({
                parametri: { operation: 'search', query: 'x' },
                risposta: { [campo]: [{ id: '1' }, { id: '2' }] },
            });
            const out = await esegui(new ScalaScore(), c);
            expect(out[0]).toHaveLength(2);
            expect(out[0][0].json).toEqual({ id: '1' });
        }
    );

    it('una risposta che non e un elenco resta un elemento solo', async () => {
        const c = contesto({
            parametri: { operation: 'stats' },
            risposta: { total_companies: 244_000_000 },
        });
        const out = await esegui(new ScalaScore(), c);
        expect(out[0]).toHaveLength(1);
        expect(out[0][0].json).toEqual({ total_companies: 244_000_000 });
    });

    it('accetta una risposta arrivata come stringa JSON', async () => {
        const c = contesto({
            parametri: { operation: 'stats' },
            risposta: JSON.stringify({ ok: true }),
        });
        const out = await esegui(new ScalaScore(), c);
        expect(out[0][0].json).toEqual({ ok: true });
    });

    it('un elenco vuoto non produce elementi', async () => {
        const c = contesto({
            parametri: { operation: 'search', query: 'x' },
            risposta: { results: [] },
        });
        const out = await esegui(new ScalaScore(), c);
        expect(out[0]).toHaveLength(0);
    });

    it('fa una richiesta per ogni elemento in ingresso', async () => {
        const c = contesto({ parametri: { operation: 'stats' }, elementi: 3 });
        await esegui(new ScalaScore(), c);
        expect(c.viste).toHaveLength(3);
    });
});

// ═══════════════════════════ ScalaCrm ═══════════════════════════

describe('ScalaCrm — contatti', () => {
    it('getAll e una GET sull elenco', async () => {
        const c = contesto({ parametri: { resource: 'contact', operation: 'getAll' } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('GET');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/crm/contacts');
    });

    it('create manda i campi e spezza i tag sulla virgola', async () => {
        const c = contesto({
            parametri: {
                resource: 'contact', operation: 'create',
                contactName: 'Mario Rossi', contactEmail: 'm@r.it',
                contactTags: 'lead, caldo , ',
            },
        });
        await esegui(new ScalaCrm(), c);
        const b = c.viste[0].body as Record<string, unknown>;
        expect(c.viste[0].method).toBe('POST');
        expect(b.name).toBe('Mario Rossi');
        // gli spazi si tolgono e i pezzi vuoti si scartano
        expect(b.tags).toEqual(['lead', 'caldo']);
    });

    it('create usa lead come stadio predefinito', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'create', contactName: 'x' },
        });
        await esegui(new ScalaCrm(), c);
        expect((c.viste[0].body as Record<string, unknown>).pipeline_stage).toBe('lead');
    });

    it('i campi aggiuntivi si sovrappongono a quelli espliciti', async () => {
        const c = contesto({
            parametri: {
                resource: 'contact', operation: 'create', contactName: 'x',
                additionalFields: '{"pipeline_stage":"cliente","note":"vip"}',
            },
        });
        await esegui(new ScalaCrm(), c);
        const b = c.viste[0].body as Record<string, unknown>;
        expect(b.pipeline_stage).toBe('cliente');
        expect(b.note).toBe('vip');
    });

    it('update e una PUT sull identificativo', async () => {
        const c = contesto({
            parametri: {
                resource: 'contact', operation: 'update', contactId: 'abc',
                additionalFields: '{"name":"nuovo"}',
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('PUT');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/crm/contacts/abc');
        expect(c.viste[0].body).toEqual({ name: 'nuovo' });
    });

    it('delete e una DELETE sull identificativo', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'delete', contactId: 'abc' },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('DELETE');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/crm/contacts/abc');
    });

    it('timeline e una GET sul sottopercorso', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'timeline', contactId: 'abc' },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/crm/contacts/abc/timeline');
    });
});

describe('ScalaCrm — le altre risorse', () => {
    it.each([
        ['pipeline', 'get', '/api/crm/pipeline'],
        ['pipeline', 'kanban', '/api/crm/kanban'],
    ])('%s/%s va su %s', async (resource, operation, percorso) => {
        const c = contesto({ parametri: { resource, operation } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe(`https://app.get-scala.com${percorso}`);
    });

    it('data/getAll porta il limite in coda', async () => {
        const c = contesto({
            parametri: { resource: 'data', operation: 'getAll', tableName: 'okrs', dataLimit: 25 },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/data/okrs?limit=25');
    });

    it('data/create e una POST con il record', async () => {
        const c = contesto({
            parametri: {
                resource: 'data', operation: 'create', tableName: 'okrs',
                recordData: '{"objective":"crescere"}',
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('POST');
        expect(c.viste[0].body).toEqual({ objective: 'crescere' });
    });

    it('data/delete e una DELETE sul record', async () => {
        const c = contesto({
            parametri: { resource: 'data', operation: 'delete', tableName: 'okrs', recordId: 'r1' },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('DELETE');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/data/okrs/r1');
    });

    it('webhook/getAll va sull elenco dei webhook', async () => {
        const c = contesto({ parametri: { resource: 'webhook', operation: 'getAll' } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/webhooks');
    });
});

describe('ScalaCrm — autenticazione', () => {
    it('usa il gettone come Bearer, non come chiave API', async () => {
        const c = contesto({ parametri: { resource: 'contact', operation: 'getAll' } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].headers.Authorization).toBe('Bearer gettone');
        expect(c.viste[0].headers['X-API-Key']).toBeUndefined();
    });

    it('non mette mai il gettone nell URL', async () => {
        const c = contesto({ parametri: { resource: 'contact', operation: 'getAll' } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).not.toContain('gettone');
    });
});

// ═══════════════════════════ Metadati ═══════════════════════════
// n8n rifiuta un nodo malformato al caricamento, e un pacchetto pubblicato
// che non si carica e peggio di uno che sbaglia una chiamata.

describe('descrizione dei nodi', () => {
    it.each([
        ['ScalaScore', new ScalaScore()],
        ['ScalaCrm', new ScalaCrm()],
    ])('%s dichiara nome, gruppo, versione e ingressi', (_n, nodo) => {
        const d = (nodo as { description: Record<string, unknown> }).description;
        expect(typeof d.displayName).toBe('string');
        expect(typeof d.name).toBe('string');
        expect(Array.isArray(d.group)).toBe(true);
        expect(typeof d.version).toBe('number');
        expect(Array.isArray(d.inputs)).toBe(true);
        expect(Array.isArray(d.outputs)).toBe(true);
        expect(Array.isArray(d.properties)).toBe(true);
    });

    it.each([
        ['ScalaScore', new ScalaScore()],
        ['ScalaCrm', new ScalaCrm()],
    ])('%s: ogni proprieta ha displayName, name e type', (_n, nodo) => {
        const props = (nodo as { description: { properties: Array<Record<string, unknown>> } })
            .description.properties;
        expect(props.length).toBeGreaterThan(0);
        for (const p of props) {
            expect(typeof p.displayName, JSON.stringify(p)).toBe('string');
            expect(typeof p.name, JSON.stringify(p)).toBe('string');
            expect(typeof p.type, JSON.stringify(p)).toBe('string');
        }
    });

    it.each([
        ['ScalaScore', new ScalaScore()],
        ['ScalaCrm', new ScalaCrm()],
    ])('%s dichiara la credenziale che poi chiede a runtime', (_n, nodo) => {
        const d = (nodo as { description: { credentials?: Array<{ name: string }> } }).description;
        expect(d.credentials?.length).toBeGreaterThan(0);
    });
});

describe('credenziali', () => {
    it('la chiave dello Score e marcata come segreta', () => {
        const p = new ScalaScoreApi().properties.find(x => x.name === 'apiKey');
        expect(p?.typeOptions?.password).toBe(true);
    });

    it('il gettone del CRM e marcato come segreto', () => {
        const p = new ScalaCrmApi().properties.find(x => x.name === 'apiToken');
        expect(p?.typeOptions?.password).toBe(true);
    });

    it.each([
        ['scalaScoreApi', new ScalaScoreApi()],
        ['scalaCrmApi', new ScalaCrmApi()],
    ])('%s espone un baseUrl con un valore predefinito', (nome, cred) => {
        expect(cred.name).toBe(nome);
        const b = cred.properties.find(x => x.name === 'baseUrl');
        expect(b?.default).toBe('https://app.get-scala.com');
    });
});

describe('ScalaCrm — ticket e webhook, i rami che restavano scoperti', () => {
    // La risorsa ticket usa la tabella 'tickets' cablata nel nodo: il
    // parametro tableName non lo guarda, e va verificato che non lo guardi.
    it.each([
        ['getAll', 'GET'],
        ['create', 'POST'],
    ])('ticket/%s va su /api/data/tickets con metodo %s', async (operation, method) => {
        const c = contesto({
            parametri: { resource: 'ticket', operation, tableName: 'ignorata', recordData: '{"a":1}' },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/data/tickets');
        expect(c.viste[0].method).toBe(method);
    });

    it('ticket/update e una PUT sull identificativo', async () => {
        const c = contesto({
            parametri: {
                resource: 'ticket', operation: 'update', recordId: 't9', recordData: '{"status":"chiuso"}',
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('PUT');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/data/tickets/t9');
        expect(c.viste[0].body).toEqual({ status: 'chiuso' });
    });

    it('data/update e una PUT sulla tabella scelta', async () => {
        const c = contesto({
            parametri: {
                resource: 'data', operation: 'update', tableName: 'okrs',
                recordId: 'r1', recordData: '{"objective":"nuovo"}',
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('PUT');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/data/okrs/r1');
    });

    it('webhook/create manda url ed eventi', async () => {
        const c = contesto({
            parametri: {
                resource: 'webhook', operation: 'create',
                webhookUrl: 'https://mio.test/hook', webhookEvents: ['contact.created'],
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('POST');
        expect(c.viste[0].body).toMatchObject({
            url: 'https://mio.test/hook', events: ['contact.created'],
        });
    });

    it.each([
        ['delete', 'DELETE', '/api/webhooks/w1'],
        ['test', 'POST', '/api/webhooks/w1/test'],
    ])('webhook/%s -> %s %s', async (operation, method, percorso) => {
        const c = contesto({ parametri: { resource: 'webhook', operation, webhookId: 'w1' } });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe(method);
        expect(c.viste[0].url).toBe(`https://app.get-scala.com${percorso}`);
    });

    it('contact/email e una POST su /api/crm/email', async () => {
        const c = contesto({
            parametri: {
                resource: 'contact', operation: 'email',
                contactId: 'abc', emailSubject: 'ciao', emailBody: 'testo',
            },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].method).toBe('POST');
        expect(c.viste[0].url).toBe('https://app.get-scala.com/api/crm/email');
    });
});

describe('ScalaCrm — lettura della risposta', () => {
    it.each(['data', 'results'])('spacchetta l elenco trovato in %s', async (campo) => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'getAll' },
            risposta: { [campo]: [{ id: '1' }, { id: '2' }] },
        });
        const out = await esegui(new ScalaCrm(), c);
        expect(out[0]).toHaveLength(2);
    });

    it('accetta anche una risposta che e gia un elenco', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'getAll' },
            risposta: [{ id: '1' }],
        });
        const out = await esegui(new ScalaCrm(), c);
        expect(out[0]).toHaveLength(1);
    });

    it('un oggetto singolo resta un elemento solo', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'getAll' },
            risposta: { id: '1' },
        });
        const out = await esegui(new ScalaCrm(), c);
        expect(out[0]).toHaveLength(1);
    });

    it('accetta una risposta arrivata come stringa JSON', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'getAll' },
            risposta: JSON.stringify({ id: '1' }),
        });
        const out = await esegui(new ScalaCrm(), c);
        expect(out[0][0].json).toEqual({ id: '1' });
    });

    it('toglie la barra finale dal baseUrl', async () => {
        const c = contesto({
            parametri: { resource: 'contact', operation: 'getAll' },
            credenziali: { apiToken: 't', baseUrl: 'https://esempio.test/' },
        });
        await esegui(new ScalaCrm(), c);
        expect(c.viste[0].url).toBe('https://esempio.test/api/crm/contacts');
    });
});

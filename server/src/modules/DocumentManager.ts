import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';
import { AstParser } from './AstParser';
import type { ConnectionManager } from './ConnectManager';
export interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();


export class DocumentManager {
	private _documents: TextDocuments<TextDocument>  
	private astParser: AstParser | null = null
	constructor(private _connManager: ConnectionManager) {
		this._documents = new TextDocuments(TextDocument);
		this.init()
	}
	get documents() {
		return this._documents;
	}
	private init() {
		this.bind()
		this.initAstParser();
		// 绑定文档对象和 lsp connector
		this._documents.listen(this._connManager.connection);
	}
	initAstParser() {
		if(this.astParser) {
			return this.astParser
		}
		this.astParser = new AstParser()
	}
	private bind() {	
		this.handleDidClose()
		// this.handleDidChange()
	}

	private handleDidClose(){
		this._documents.onDidClose(e => {
			documentSettings.delete(e.document.uri);
		});
	}

	private async handleDidChange() {
		this._documents.onDidChangeContent(async change => {
			const diagnostics = await this.astParser?.parser(change.document)
			diagnostics && 
			this._connManager.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
		});
	}
}



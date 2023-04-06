import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';
import { AstParser } from './AstParser.deprecate';
import type { ConnectionManager } from './ConnectManager';
export interface ExampleSettings {
	maxNumberOfProblems: number;
}


const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();


export class DocumentManager {
	private _documents = new TextDocuments(TextDocument);
	private astParser = new AstParser()
	constructor(private _connManager: ConnectionManager) {
		this.init()
	}
	get documents() {
		return this._documents;
	}
	private init() {
		this.bindEvent()
		// 绑定文档对象和 lsp connector
		this._documents.listen(this._connManager.connection);
	}

	private bindEvent() {	
		this.handleDidClose()
		// TODO: 有 bug，node 不能获取 parent
		// this.handleDidChange()
	}

	private handleDidClose(){
		this._documents.onDidClose(e => {
			documentSettings.delete(e.document.uri);
		});
	}

	private async handleDidChange() {
		this._documents.onDidChangeContent(change => {
			const diagnostics = this.astParser.parser(change.document)
			diagnostics && 
			this._connManager.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
		});
	}
}



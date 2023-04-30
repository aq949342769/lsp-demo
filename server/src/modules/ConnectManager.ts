import { createConnection, DidChangeConfigurationNotification, InitializeParams, InitializeResult, ProposedFeatures, TextDocumentSyncKind } from 'vscode-languageserver/node';

export class ConnectionManager {
	private _hasConfigurationCapability = false;
	private _hasWorkspaceFolderCapability = false;
	private _hasDiagnosticRelatedInformationCapability = false;
	constructor(private _connection = createConnection(ProposedFeatures.all)) {
		this.init();
	}
	get connection(){
		return this._connection
	}

	get hasConfigurationCapability() {
		return this._hasConfigurationCapability
	}
	get hasWorkspaceFolderCapability() {
		return this._hasWorkspaceFolderCapability
	}

	get hasDiagnosticRelatedInformationCapability() {
		return this._hasDiagnosticRelatedInformationCapability
	}

	private init() {
		this.bindEvent()
		this._connection.listen();
	}

	private	bindEvent() {
		this.handleInitialize()
		this.handleInitialized()
		this.handleDidChangeWatchedFiles()
	}

	private handleDidChangeWatchedFiles() {
		this._connection.onDidChangeWatchedFiles(_change => {
			this._connection.console.log('We received an file change event');
		});
	}

  private	handleInitialized() {
		this._connection.onInitialized(() => {
			if (this._hasConfigurationCapability) {
				this._connection.client.register(DidChangeConfigurationNotification.type, undefined);
			}
			if (this._hasWorkspaceFolderCapability) {
				this._connection.workspace.onDidChangeWorkspaceFolders(_event => {
					this._connection.console.log('Workspace folder change event received.');
				});
			}
		});
	}

	private handleInitialize() {
		this._connection.onInitialize((params: InitializeParams) => {
			const capabilities = params.capabilities;

			this._hasConfigurationCapability = !!(
				capabilities.workspace && !!capabilities.workspace.configuration
			);
			this._hasWorkspaceFolderCapability = !!(
				capabilities.workspace && !!capabilities.workspace.workspaceFolders
			);
			this._hasDiagnosticRelatedInformationCapability = !!(
				capabilities.textDocument &&
				capabilities.textDocument.publishDiagnostics &&
				capabilities.textDocument.publishDiagnostics.relatedInformation
			);

			const result: InitializeResult = {
				capabilities: {
					textDocumentSync: TextDocumentSyncKind.Incremental,
				}
			};
			if (this._hasWorkspaceFolderCapability) {
				result.capabilities.workspace = {
					workspaceFolders: {
						supported: true
					}
				};
			}
			return result;
		});
	}
}
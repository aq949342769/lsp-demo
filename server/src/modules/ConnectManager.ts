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
			// Monitored files have change in VSCode
			this._connection.console.log('We received an file change event');
		});
	}

  private	handleInitialized() {
		this._connection.onInitialized(() => {
			if (this._hasConfigurationCapability) {
				// Register for all configuration changes.
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

			// Does the client support the `workspace/configuration` request?
			// If not, we fall back using global settings.
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
					// // Tell the client that this server supports code completion.
					// completionProvider: {
					// 	resolveProvider: true
					// }
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
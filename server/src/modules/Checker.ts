import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export abstract class Checker {
	abstract visit: (...arg: any) => Diagnostic[]
}
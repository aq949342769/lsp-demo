import { SourceFile, Token } from 'typescript';

export interface MySourceFile extends SourceFile {
	imports?: Token<any>[]
}
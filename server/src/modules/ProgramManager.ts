import * as ts from 'typescript'
import { watchMain } from '../getWatchProgram';
import { getAllFiles } from '../utils/getAllFiles'
import * as path from 'path'
import * as fs from 'fs'

export class ProgramManager {
	tsfiles: string[] | undefined;
	host: ts.CompilerHost | undefined;
	private _program: ts.Program | undefined;
	private _watchProgram: ts.SemanticDiagnosticsBuilderProgram | undefined;
	private _checker: ts.TypeChecker | undefined;
	private _watchConfigFile: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram> | undefined;
	private _configPath: string | undefined;
	constructor(rootPath: string = 'src') {
		this.init(rootPath)
	
	}

	private async init(rootPath: string = 'src'){
		const configPath = ts.findConfigFile(
			/*searchPath*/ "./",
			ts.sys.fileExists,
			"tsconfig.json"
		); 
		if(!configPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}
		this._configPath = configPath
		this.tsfiles = getAllFiles(rootPath); 
		const compileOptions = JSON.parse(fs.readFileSync(configPath, 'utf8'))?.compilerOptions as ts.CompilerOptions
		this._program = ts.createProgram(this.tsfiles, compileOptions)
		this._checker = this._program.getTypeChecker()
		this._watchConfigFile = watchMain(this._configPath)
		this._watchProgram = this._watchConfigFile.getProgram()
	}

	/** 增量的 program，用于生成诊断位置 */
	get watchPrograom() {
		this._watchProgram = this._watchConfigFile?.getProgram()
		return this._watchProgram
	}

	/** 原始 program，用于 checker */
	get program() {
		return this._program
	}

	get checker() {
		return this._checker
	}

}
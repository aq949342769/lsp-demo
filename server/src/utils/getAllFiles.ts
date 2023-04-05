/**
 * @desc 深度循环遍历，检索指定目录下所有 .tsx .ts 文件，并 push 到指定数组；
 * @param directory - 指定目录
 * @param filePathArr - 指定数组
 */
import * as path from 'path';
import * as fse from 'fs-extra'
const deepLoopTraversal = (directory: string, filePathArr: any[]) => {

	const filesList = fse.readdirSync(directory)
	for (let i = 0, len = filesList.length; i < len; i++) {
		const filename = filesList[i];
		const filePath = path.join(directory, filename);
		const stats = fse.statSync(filePath);
		if (stats.isDirectory()) {
			deepLoopTraversal(filePath, filePathArr);
		} else {
			const isFile = stats.isFile();
			const extname = isFile ? path.extname(filePath) : '';
			if (extname === '.tsx' || extname === '.ts') {
				filePathArr.push(filePath)
			}
		}
	}
}

export const getAllFiles = (path: string) => {
	const filePathArr: Array<string> = []
	deepLoopTraversal(path, filePathArr)
	console.log(`您指定的目录下，是 .js 或 .ts 文件，有以下内容：`)
	console.log(filePathArr)
	return filePathArr;
}
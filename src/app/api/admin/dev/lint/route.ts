export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createLogger } from '@/lib/logger';
import ts from 'typescript';
import path from 'path';

const logger = createLogger('dev-lint');

interface LintError {
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
  code: number;
}

function lintTypeScript(filePath: string, content: string): LintError[] {
  try {
    // Try to use the project tsconfig for accurate checking
    const projectRoot = process.cwd();
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    const tsconfigContent = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      tsconfigContent.config,
      ts.sys,
      projectRoot
    );

    const compilerOptions: ts.CompilerOptions = {
      ...parsed.options,
      noEmit: true,
      skipLibCheck: true,
      // Override to inline check
      isolatedModules: false,
    };

    // Create a virtual compiler host with the file content in memory
    const defaultHost = ts.createCompilerHost(compilerOptions);
    const customHost: ts.CompilerHost = {
      ...defaultHost,
      getSourceFile: (name, languageVersion) => {
        const normalizedName = name.replace(/\\/g, '/');
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        if (normalizedName.endsWith(normalizedFilePath) || normalizedName === normalizedFilePath) {
          return ts.createSourceFile(name, content, languageVersion);
        }
        return defaultHost.getSourceFile(name, languageVersion);
      },
    };

    const program = ts.createProgram([filePath], compilerOptions, customHost);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const errors: LintError[] = [];
    for (const diag of diagnostics) {
      if (!diag.file) continue;
      const fileName = diag.file.fileName.replace(/\\/g, '/');
      const targetFile = filePath.replace(/\\/g, '/');
      if (!fileName.endsWith(targetFile) && !targetFile.endsWith(fileName)) continue;

      const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start ?? 0);
      errors.push({
        line: line + 1,
        col: character + 1,
        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
        severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
        code: diag.code,
      });
    }

    return errors.slice(0, 50);
  } catch (err) {
    logger.warn('Lint check failed', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { filePath, content } = await request.json() as { filePath: string; content: string };
    if (!filePath || !content) {
      return NextResponse.json({ error: 'filePath and content required' }, { status: 400 });
    }

    // Only lint TypeScript/TSX files
    const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    if (!isTs) {
      return NextResponse.json({ errors: [], filePath });
    }

    const errors = lintTypeScript(filePath, content);
    return NextResponse.json({ errors, filePath });
  } catch (err) {
    logger.error('dev lint POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

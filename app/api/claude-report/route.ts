import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';

const reportPath = path.join(process.cwd(), 'data', 'claude-report.json');

export async function GET() {
  try {
    const raw = await fs.readFile(reportPath, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: 'Claude report not found. Please run `npm run generate-report`.' },
      { status: 404 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.regenerate) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await new Promise<void>((resolve, reject) => {
      exec('npm run generate-report', { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error('Claude report regeneration failed:', stderr || error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });

    const raw = await fs.readFile(reportPath, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to regenerate Claude report.' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_FILES_DIR = '/app/test_files'; // Path inside Docker container

export async function POST(request: Request) {
  try {
    const githubVersion = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'unknown';

    const testFileNames = (await fs.readdir(TEST_FILES_DIR)).filter(name => name.endsWith('.pdf'));

    if (testFileNames.length === 0) {
      return NextResponse.json({ message: 'No PDF test files found in test_files directory.' }, { status: 404 });
    }

    const results: { fileName: string; operation: string; status: string; error?: string }[] = [];

    for (const fileName of testFileNames) {
      const filePath = path.join(TEST_FILES_DIR, fileName);
      const fileBuffer = await fs.readFile(filePath);const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      
      const testBlob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
      // --- Test Compression ---
      try {
        const formData = new FormData();
        formData.append('file', testBlob, fileName);
        formData.append('githubVersion', githubVersion);
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pdf-compress`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Compression failed: ${response.status} - ${errorText}`);
        }
        results.push({ fileName, operation: 'compress', status: 'success' });
      } catch (error: any) {
        results.push({ fileName, operation: 'compress', status: 'failed', error: error.message });
      }

      // --- Test Conversion (to PNG) ---
      try {
        const formData = new FormData();
        formData.append('file', testBlob, fileName);
        formData.append('targetFormat', 'png');
        formData.append('githubVersion', githubVersion);
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pdf-convert`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Conversion failed: ${response.status} - ${errorText}`);
        }
        results.push({ fileName, operation: 'convert', status: 'success' });
      } catch (error: any) {
        results.push({ fileName, operation: 'convert', status: 'failed', error: error.message });
      }

      // --- Test Edit (extract first page) ---
      try {
        const formData = new FormData();
        formData.append('file', testBlob, fileName);
        formData.append('pageInstructions', JSON.stringify([0])); // Extract first page
        formData.append('githubVersion', githubVersion);
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pdf-edit`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Edit failed: ${response.status} - ${errorText}`);
        }
        results.push({ fileName, operation: 'edit', status: 'success' });
      } catch (error: any) {
        results.push({ fileName, operation: 'edit', status: 'failed', error: error.message });
      }

      // --- Test Merge (merge with itself) ---
      try {
        const formData = new FormData();
        formData.append('files', testBlob, fileName);
        formData.append('files', testBlob, fileName); // Merge with itself
        formData.append('githubVersion', githubVersion);
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pdf-merge`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Merge failed: ${response.status} - ${errorText}`);
        }
        results.push({ fileName, operation: 'merge', status: 'success' });
      } catch (error: any) {
        results.push({ fileName, operation: 'merge', status: 'failed', error: error.message });
      }
    }

    return NextResponse.json({ message: 'Performance test completed', githubVersion, results });
  } catch (error) {
    console.error('Error during performance test execution:', error);
    return NextResponse.json({ error: 'Failed to execute performance test' }, { status: 500 });
  }
}
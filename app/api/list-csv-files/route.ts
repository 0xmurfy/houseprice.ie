import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const salesDataDir = path.join(process.cwd(), 'public', 'salesdata');
    const files = fs.readdirSync(salesDataDir)
      .filter(file => file.endsWith('.csv'))
      .sort((a, b) => {
        // Extract years from filenames and sort in descending order
        const yearA = a.match(/\d{4}/)?.[0] || '';
        const yearB = b.match(/\d{4}/)?.[0] || '';
        return yearB.localeCompare(yearA);
      });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error reading salesdata directory:', error);
    return NextResponse.json([]);
  }
} 
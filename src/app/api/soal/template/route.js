import * as XLSX from 'xlsx-js-style';
import { NextResponse } from 'next/server';
import { buildSoalTemplateWorkbook } from '@/lib/generateSoalTemplate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = buildSoalTemplateWorkbook();
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Import_Soal.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating soal template:', error);
    return NextResponse.json({ error: 'Gagal mengunduh template Excel soal' }, { status: 500 });
  }
}

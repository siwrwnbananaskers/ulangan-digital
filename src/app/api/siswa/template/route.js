import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = [
      {
        'Username': 'siswa1',
        'Nama Siswa': 'Ahmad Rizki Pratama',
        'Kelas': '5',
        'No Absen': 1,
        'Password': '123456',
      },
      {
        'Username': 'siswa2',
        'Nama Siswa': 'Siti Nurhaliza',
        'Kelas': '5',
        'No Absen': 2,
        'Password': '123456',
      },
      {
        'Username': 'siswa3',
        'Nama Siswa': 'Budi Santoso',
        'Kelas': '5',
        'No Absen': 3,
        'Password': '123456',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 18 }, // Username
      { wch: 32 }, // Nama Siswa
      { wch: 16 }, // Kelas
      { wch: 14 }, // No Absen
      { wch: 18 }, // Password
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Siswa.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Gagal mengunduh template Excel' }, { status: 500 });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import * as ExcelJS from 'exceljs';
import dayjs from 'dayjs';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async studentsExcel(): Promise<Buffer> {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const students = await this.prisma.student.findMany({
      where: { instituteId, isActive: true },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { class: true, section: true, batch: true, academicYear: true },
          take: 1,
        },
        guardians: {
          where: { isPrimary: true },
          include: { guardian: { select: { firstName: true, lastName: true, phone: true, relationship: true } } },
          take: 1,
        },
      },
      orderBy: { admissionNo: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Students');

    ws.columns = [
      { header: 'Admission No', key: 'admissionNo', width: 15 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Section', key: 'section', width: 12 },
      { header: 'Academic Year', key: 'academicYear', width: 18 },
      { header: 'Guardian Name', key: 'guardian', width: 20 },
      { header: 'Guardian Phone', key: 'guardianPhone', width: 15 },
    ];

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const s of students) {
      const enr = s.enrollments[0];
      const g = s.guardians[0]?.guardian;
      ws.addRow({
        admissionNo: s.admissionNo,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender ?? '',
        dob: s.dateOfBirth ? dayjs(s.dateOfBirth).format('DD/MM/YYYY') : '',
        phone: s.phone ?? '',
        class: enr?.class?.name ?? '',
        section: enr?.section?.name ?? '',
        academicYear: enr?.academicYear?.name ?? '',
        guardian: g ? `${g.firstName} ${g.lastName} (${g.relationship})` : '',
        guardianPhone: g?.phone ?? '',
      });
    }

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  async attendanceExcel(date: string): Promise<Buffer> {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const targetDate = dayjs(date).startOf('day').toDate();

    const records = await this.prisma.attendanceRecord.findMany({
      where: { instituteId, date: targetDate },
      include: {
        student: { select: { admissionNo: true, firstName: true, lastName: true } },
        section: { select: { name: true } },
      },
      orderBy: [{ section: { name: 'asc' } }, { student: { admissionNo: 'asc' } }],
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Attendance ${date}`);

    ws.columns = [
      { header: 'Admission No', key: 'admissionNo', width: 15 },
      { header: 'Student Name', key: 'name', width: 22 },
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 25 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    for (const r of records) {
      const row = ws.addRow({
        admissionNo: r.student.admissionNo,
        name: `${r.student.firstName} ${r.student.lastName}`,
        section: r.section?.name ?? '',
        status: r.status,
        remarks: r.remarks ?? '',
      });
      if (r.status === 'ABSENT') row.getCell('status').font = { color: { argb: 'FFE53E3E' } };
      if (r.status === 'PRESENT') row.getCell('status').font = { color: { argb: 'FF38A169' } };
    }

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }
}

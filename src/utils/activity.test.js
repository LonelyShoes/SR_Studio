import { describe, expect, it } from 'vitest';
import { activityKind, describeActivity, formatRelativeTime, initialsOf } from './activity';

describe('log aktivitas', () => {
  it('menyusun kalimat untuk setiap jenis aktivitas', () => {
    expect(describeActivity({ type: 'edit.boq', projectName: 'Rumah A', count: 3 })).toBe('mengubah 3 isian RAB di "Rumah A"');
    expect(describeActivity({ type: 'edit.schedule', projectName: 'Rumah A' })).toBe('memperbarui jadwal/progres "Rumah A" (1 perubahan)');
    expect(describeActivity({ type: 'project.checkpoint', projectName: 'Ruko', detail: 'Rev atap' })).toBe('menyimpan versi "Ruko" — Rev atap');
    expect(describeActivity({ type: 'project.delete' })).toBe('memindahkan proyek sebuah proyek ke Sampah');
    expect(describeActivity({ type: 'otp.redeem', detail: 'mengakses BoQ' })).toBe('memakai Kode OTP untuk mengakses BoQ');
    expect(describeActivity({ type: 'jenis.baru' })).toBe('melakukan perubahan');
    expect(describeActivity(undefined)).toBe('melakukan perubahan');
  });

  it('mengelompokkan jenis aktivitas', () => {
    expect(activityKind('edit.calc')).toBe('edit');
    expect(activityKind('project.delete')).toBe('delete');
    expect(activityKind('otp.redeem')).toBe('security');
    expect(activityKind('project.create')).toBe('project');
  });
});

describe('waktu relatif & inisial', () => {
  const now = Date.parse('2026-11-11T12:00:00+07:00');

  it('memformat rentang waktu dalam bahasa Indonesia', () => {
    expect(formatRelativeTime(now - 10_000, now)).toBe('baru saja');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 menit lalu');
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3 jam lalu');
    expect(formatRelativeTime(now - 30 * 3_600_000, now)).toMatch(/^kemarin \d{2}[.:]\d{2}$/);
    expect(formatRelativeTime(new Date(now - 5 * 86_400_000).toISOString(), now)).toMatch(/2026/);
    expect(formatRelativeTime(now + 60_000, now)).toBe('baru saja'); // jam perangkat sedikit berbeda
    expect(formatRelativeTime(0, now)).toBe('-');
    expect(formatRelativeTime('bukan tanggal', now)).toBe('-');
  });

  it('inisial mengabaikan tanda baca', () => {
    expect(initialsOf('Budi Santoso')).toBe('BS');
    expect(initialsOf('Rafi (PC)')).toBe('RP');
    expect(initialsOf('master')).toBe('MA');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('Klien 4F2A')).toBe('K4');
  });
});

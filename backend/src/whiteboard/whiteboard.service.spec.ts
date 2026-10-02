import { BadRequestException } from '@nestjs/common';
import { WhiteboardService } from './whiteboard.service';

describe('WhiteboardService', () => {
  let service: WhiteboardService;

  const stroke = (overrides: Record<string, unknown> = {}) => ({
    id: 'stroke-1',
    page: 1,
    tool: 'pen',
    color: '#0b7a76',
    width: 0.004,
    points: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
    ...overrides,
  });

  beforeEach(() => {
    service = new WhiteboardService();
  });

  it('only opens PDFs that were uploaded to the server', () => {
    expect(() =>
      service.open('Oda', 1, 'Enes', 'https://evil.example/a.pdf', 'a.pdf'),
    ).toThrow(BadRequestException);
    expect(() =>
      service.open('Oda', 1, 'Enes', '/uploads/../secret.pdf', 'a.pdf'),
    ).toThrow(BadRequestException);
    expect(() =>
      service.open('Oda', 1, 'Enes', '/uploads/123-notes.png', 'a.png'),
    ).toThrow(BadRequestException);

    const board = service.open(
      'Oda',
      1,
      'Enes',
      '/uploads/123-notes.pdf',
      'Notlar.pdf',
    );
    expect(board).toMatchObject({
      page: 1,
      fileName: 'Notlar.pdf',
      strokes: [],
    });
  });

  it('stores valid strokes and clamps coordinates', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    const saved = service.addStroke(
      'Oda',
      2,
      stroke({
        points: [
          [-1, 2],
          [0.5, 0.5],
        ],
      }),
    );

    expect(saved?.userId).toBe(2);
    expect(saved?.points).toEqual([
      [0, 1],
      [0.5, 0.5],
    ]);
    expect(service.getState('Oda')?.strokes).toHaveLength(1);
  });

  it('rejects malformed strokes and duplicates', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');

    expect(service.addStroke('Oda', 1, stroke({ color: 'red' }))).toBeNull();
    expect(service.addStroke('Oda', 1, stroke({ width: 5 }))).toBeNull();
    expect(service.addStroke('Oda', 1, stroke({ points: [] }))).toBeNull();
    expect(service.addStroke('Oda', 1, stroke({ id: '<x>' }))).toBeNull();
    expect(service.addStroke('Yok', 1, stroke())).toBeNull();

    expect(service.addStroke('Oda', 1, stroke())).not.toBeNull();
    expect(service.addStroke('Oda', 1, stroke())).toBeNull();
  });

  it('erases strokes and clears a single page', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    service.addStroke('Oda', 1, stroke({ id: 'page1-a' }));
    service.addStroke('Oda', 1, stroke({ id: 'page1-b' }));
    service.addStroke('Oda', 1, stroke({ id: 'page2-a', page: 2 }));

    expect(service.removeStrokes('Oda', ['page1-a', 'missing'])).toEqual([
      'page1-a',
    ]);
    expect(service.clearPage('Oda', 1)).toBe(1);
    expect(service.getState('Oda')?.strokes.map((s) => s.id)).toEqual([
      'page2-a',
    ]);
  });

  it('tracks the shared page and resets when reopened', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    expect(service.setPage('Oda', 3)).toEqual({ page: 3, pageCount: null });
    expect(service.setPage('Oda', 0)).toBeNull();
    service.addStroke('Oda', 1, stroke());

    const reopened = service.open('Oda', 2, 'Ayşe', '/uploads/b.pdf', 'b.pdf');
    expect(reopened.page).toBe(1);
    expect(reopened.strokes).toHaveLength(0);

    service.dropRoom('Oda');
    expect(service.getState('Oda')).toBeNull();
  });

  it('keeps the board for a grace period after the room empties', () => {
    jest.useFakeTimers();
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');

    service.scheduleDrop('Oda', 1000);
    jest.advanceTimersByTime(500);
    service.cancelDrop('Oda');
    jest.advanceTimersByTime(1000);
    expect(service.getState('Oda')).not.toBeNull();

    service.scheduleDrop('Oda', 1000);
    jest.advanceTimersByTime(1001);
    expect(service.getState('Oda')).toBeNull();
    jest.useRealTimers();
  });

  it('keeps optional pen pressure and clamps it', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    const saved = service.addStroke(
      'Oda',
      1,
      stroke({
        points: [
          [0.1, 0.1, 0.42],
          [0.2, 0.2, 3],
          [0.3, 0.3],
        ],
      }),
    );

    expect(saved?.points).toEqual([
      [0.1, 0.1, 0.42],
      [0.2, 0.2, 1],
      [0.3, 0.3],
    ]);
  });

  it('relays laser strokes live but never stores them', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    const laser = stroke({ id: 'laser-1', tool: 'laser', color: '#f2a7bc' });

    expect(service.sanitizeLive(1, laser)?.tool).toBe('laser');
    expect(service.addStroke('Oda', 1, laser)).toBeNull();
    expect(service.getState('Oda')?.strokes).toHaveLength(0);
  });

  it('opens a blank board that grows one page at a time', () => {
    const board = service.openBlank('Oda', 1, 'Enes');
    expect(board).toMatchObject({ kind: 'blank', fileUrl: null, pageCount: 1 });

    expect(service.setPage('Oda', 3)).toBeNull();
    expect(service.setPage('Oda', 2)).toEqual({ page: 2, pageCount: 2 });
    expect(service.setPage('Oda', 1)).toEqual({ page: 1, pageCount: 2 });
  });

  it('reports no page count for PDF boards', () => {
    service.open('Oda', 1, 'Enes', '/uploads/a.pdf', 'a.pdf');
    expect(service.setPage('Oda', 5)).toEqual({ page: 5, pageCount: null });
  });
});

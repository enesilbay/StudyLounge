import { defaults, types } from 'pg';

/**
 * Tablolardaki tarih kolonlari `timestamp without time zone` tipinde ve
 * veritabani UTC saatini yaziyor (DEFAULT now(), oturum saat dilimi UTC).
 * `pg` surucusu ise bu degerleri varsayilan olarak sunucunun YEREL saati
 * sayar. Sunucu UTC'de calisirken (Docker, bulut) sorun yok; ama yerel
 * gelistirmede (or. UTC+3) mesaj saatleri 3 saat kayiyor, "son 1 saat"
 * filtresi yeni mesajlari bile disarida birakiyor ve odalar erken kapaniyordu.
 *
 * Burada okurken ve yazarken saat dilimsiz tarihler her ortamda UTC kabul
 * edilir. Sema degismez; mobil istemci etkilenmez.
 */
export function parseUtcTimestamp(value: string): Date {
  // pg bicimi: "2026-10-02 22:39:03.123456"
  return new Date(`${value.replace(' ', 'T')}Z`);
}

let applied = false;

export function usePgUtcTimestamps() {
  if (applied) return;
  applied = true;
  types.setTypeParser(types.builtins.TIMESTAMP, parseUtcTimestamp);
  defaults.parseInputDatesAsUTC = true;
}

usePgUtcTimestamps();

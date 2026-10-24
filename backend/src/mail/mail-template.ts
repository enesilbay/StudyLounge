/**
 * E-posta sablonu. E-posta istemcileri CSS degiskenlerini ve harici stili
 * desteklemedigi icin renkler satir ici yazilir; karsiliklari marka rehberindeki
 * (docs/brand/marka-rehberi.md, web/src/index.css) mb-* token'larindadir.
 */
const COLOR = {
  bg: '#f7f7f7', // mb-surface
  card: '#ffffff', // mb-bg
  ink: '#000000', // mb-ink
  body: '#5c5c5c', // mb-body
  line: '#e2e2e2', // mb-line
  action: '#055049', // mb-action
  onAction: '#ffffff', // mb-on-action
  tint: '#e3efed', // mb-tint
  lamp: '#ffd27a', // mb-lamp
};

const FONT = "Poppins, 'Segoe UI', Helvetica, Arial, sans-serif";
const DISPLAY = "Geist, 'Segoe UI', Helvetica, Arial, sans-serif";

interface CodeMailOptions {
  /** Gelen kutusunda basligin altinda gorunen kisa on izleme metni. */
  preheader: string;
  title: string;
  /** Kodun ustundeki aciklama. */
  intro: string;
  code: string;
  /** Kodun altindaki gecerlilik / guvenlik notu. */
  note: string;
}

/** Tek kodlu e-postalar (dogrulama, sifre sifirlama, sifre degisikligi) icin ortak govde. */
export function codeMailHtml({ preheader, title, intro, code, note }: CodeMailOptions): string {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background-color:${COLOR.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.bg};">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 4px 20px;font-family:${DISPLAY};font-size:20px;font-weight:500;letter-spacing:-0.02em;color:${COLOR.ink};">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${COLOR.lamp};margin-right:8px;"></span>StudyLounge
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLOR.card};border:1px solid ${COLOR.line};border-radius:16px;padding:36px 32px;font-family:${FONT};">
                <h1 style="margin:0 0 12px;font-family:${DISPLAY};font-size:26px;font-weight:300;letter-spacing:-0.03em;line-height:1.2;color:${COLOR.ink};">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${COLOR.body};">${intro}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:${COLOR.tint};border-radius:14px;padding:22px 12px;">
                      <span style="font-family:${DISPLAY};font-size:38px;font-weight:500;letter-spacing:10px;text-indent:10px;color:${COLOR.action};">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:${COLOR.body};">${note}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${COLOR.body};">
                Ayrı masalarda, aynı lobide.<br>StudyLounge Ekibi
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

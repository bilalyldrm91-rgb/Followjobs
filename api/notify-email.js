export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY ayarlanmamış.' });

  const { type, to, taskTitle, assignedBy, deadline, priority, taskId } = req.body || {};

  if (!to || !type) return res.status(400).json({ error: 'Eksik parametre' });

  const priorityLabel = priority === 'acil' ? '🔴 Acil' : priority === 'orta' ? '🟡 Orta' : '🟢 Düşük';

  let subject = '';
  let html = '';

  if (type === 'assigned') {
    subject = `📋 Yeni görev atandı: ${taskTitle}`;
    html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e4;">
        <div style="background:#1a1a1a;padding:24px 28px;">
          <div style="font-size:20px;font-weight:700;color:#fff;">İş Takip</div>
        </div>
        <div style="padding:28px;">
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Yeni görev atandı 📋</div>
          <div style="font-size:14px;color:#888;margin-bottom:24px;">${assignedBy || 'Birisi'} sana bir görev atadı.</div>
          <div style="background:#f8f8f4;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
            <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:10px;">${taskTitle}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <span style="background:#FAEEDA;color:#854F0B;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">${priorityLabel}</span>
              ${deadline ? `<span style="background:#E6F1FB;color:#185FA5;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;">📅 Deadline: ${new Date(deadline).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})}</span>` : ''}
            </div>
          </div>
          <div style="font-size:13px;color:#888;border-top:1px solid #f0f0ea;padding-top:16px;">Bu e-postayı İş Takip uygulaması gönderdi.</div>
        </div>
      </div>
    `;
  } else if (type === 'mentioned') {
    subject = `💬 Bir görevde etiketlendin: ${taskTitle}`;
    html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e4;">
        <div style="background:#1a1a1a;padding:24px 28px;">
          <div style="font-size:20px;font-weight:700;color:#fff;">İş Takip</div>
        </div>
        <div style="padding:28px;">
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Bir yorumda etiketlendin 💬</div>
          <div style="font-size:14px;color:#888;margin-bottom:24px;">${assignedBy || 'Birisi'} seni bir görevin yorumunda etiketledi.</div>
          <div style="background:#f8f8f4;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
            <div style="font-size:16px;font-weight:600;color:#1a1a1a;">${taskTitle}</div>
          </div>
          <div style="font-size:13px;color:#888;border-top:1px solid #f0f0ea;padding-top:16px;">Bu e-postayı İş Takip uygulaması gönderdi.</div>
        </div>
      </div>
    `;
  } else if (type === 'deadline') {
    subject = `⏰ Deadline yaklaşıyor: ${taskTitle}`;
    html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e4;">
        <div style="background:#A32D2D;padding:24px 28px;">
          <div style="font-size:20px;font-weight:700;color:#fff;">İş Takip</div>
        </div>
        <div style="padding:28px;">
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Deadline yarın! ⏰</div>
          <div style="font-size:14px;color:#888;margin-bottom:24px;">Aşağıdaki görevin deadline'ı yarına kadar.</div>
          <div style="background:#FCEBEB;border-radius:10px;padding:18px 20px;margin-bottom:20px;border:1px solid #F7C1C1;">
            <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:8px;">${taskTitle}</div>
            <div style="font-size:13px;color:#A32D2D;font-weight:500;">📅 Deadline: ${new Date(deadline).toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          <div style="font-size:13px;color:#888;border-top:1px solid #f0f0ea;padding-top:16px;">Bu e-postayı İş Takip uygulaması gönderdi.</div>
        </div>
      </div>
    `;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'İş Takip <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Resend hatası: ' + JSON.stringify(data) });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (e) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AbsenceAlertRecipient = {
  phone: string;
  guardianName: string;
  studentName: string;
  admissionNo: string;
  date: string;
};

export type AbsenceAlertResult = {
  phone: string;
  status: 'sent' | 'failed';
  waMessageId?: string;
  error?: string;
};

export type WaProviderConfig = {
  provider: 'revengage' | 'generic';
  apiKey: string;
  apiUrl: string;
  templateId?: string;
  /** Generic provider only — use {{guardianName}} {{studentName}} {{admissionNo}} {{date}} */
  messageTemplate?: string;
};

type SendBulkResponse = {
  data?: {
    results?: Array<{ phone: string; status: string; waMessageId?: string; error?: string }>;
  };
  error?: string;
};

@Injectable()
export class RevengageWhatsappService {
  private readonly logger = new Logger(RevengageWhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  /** Falls back to env-level config if org hasn't configured WhatsApp yet. */
  buildFallbackConfig(): WaProviderConfig | null {
    const apiKey = this.config.get<string>('REVENGAGE_API_KEY');
    const templateId = this.config.get<string>('REVENGAGE_ABSENCE_TEMPLATE_ID');
    if (!apiKey || !templateId) return null;
    return {
      provider: 'revengage',
      apiKey,
      apiUrl: this.config.get<string>('REVENGAGE_API_URL') ?? 'https://platform.revengage.in',
      templateId,
    };
  }

  /** Never throws — a WhatsApp outage must never block attendance from saving. */
  async sendAbsenceAlerts(
    recipients: AbsenceAlertRecipient[],
    cfg: WaProviderConfig,
  ): Promise<AbsenceAlertResult[]> {
    if (recipients.length === 0) return [];
    return cfg.provider === 'generic'
      ? this.sendGeneric(recipients, cfg)
      : this.sendRevengage(recipients, cfg);
  }

  private async sendRevengage(
    recipients: AbsenceAlertRecipient[],
    cfg: WaProviderConfig,
  ): Promise<AbsenceAlertResult[]> {
    if (!cfg.templateId) {
      this.logger.warn('RevEngage provider missing templateId — skipping');
      return recipients.map((r) => ({ phone: r.phone, status: 'failed' as const, error: 'missing_template_id' }));
    }
    try {
      const res = await fetch(`${cfg.apiUrl}/api/v1/messages/send-bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: cfg.templateId,
          campaignName: `Absence alerts — ${recipients[0]?.date ?? ''}`,
          recipients: recipients.map((r) => ({
            phone: r.phone,
            // Order MUST match approved template body variables:
            // {{1}} guardian name, {{2}} student name, {{3}} admission no, {{4}} date
            variables: [r.guardianName, r.studentName, r.admissionNo, r.date],
          })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as SendBulkResponse;

      if (!res.ok || !data.data) {
        this.logger.error(`RevEngage send-bulk failed (${res.status}): ${data.error ?? 'unknown error'}`);
        return recipients.map((r) => ({ phone: r.phone, status: 'failed' as const, error: data.error ?? `http_${res.status}` }));
      }

      const byPhone = new Map((data.data.results ?? []).map((r) => [r.phone.replace(/\D/g, ''), r]));
      return recipients.map((r) => {
        const result = byPhone.get(r.phone.replace(/\D/g, ''));
        if (!result) return { phone: r.phone, status: 'failed' as const, error: 'no_result_returned' };
        return {
          phone: r.phone,
          status: result.status === 'sent' ? ('sent' as const) : ('failed' as const),
          waMessageId: result.waMessageId,
          error: result.error,
        };
      });
    } catch (err) {
      this.logger.error('RevEngage send-bulk request failed', err as Error);
      return recipients.map((r) => ({ phone: r.phone, status: 'failed' as const, error: (err as Error).message }));
    }
  }

  /** Generic provider: POST { phone, message } to org-configured URL, one request per recipient. */
  private async sendGeneric(
    recipients: AbsenceAlertRecipient[],
    cfg: WaProviderConfig,
  ): Promise<AbsenceAlertResult[]> {
    const template =
      cfg.messageTemplate ??
      'Dear {{guardianName}}, your child {{studentName}} ({{admissionNo}}) was marked ABSENT on {{date}}.';

    const results = await Promise.allSettled(
      recipients.map(async (r) => {
        const message = template
          .replace('{{guardianName}}', r.guardianName)
          .replace('{{studentName}}', r.studentName)
          .replace('{{admissionNo}}', r.admissionNo)
          .replace('{{date}}', r.date);

        const res = await fetch(cfg.apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: r.phone, message }),
        });

        if (!res.ok) throw new Error(`http_${res.status}`);
        return r.phone;
      }),
    );

    return recipients.map((r, i) => {
      const result = results[i];
      if (result.status === 'fulfilled') return { phone: r.phone, status: 'sent' as const };
      this.logger.error(`Generic WA send failed for ${r.phone}: ${(result.reason as Error).message}`);
      return { phone: r.phone, status: 'failed' as const, error: (result.reason as Error).message };
    });
  }
}

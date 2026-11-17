export interface MailPayload { sender: string; recipient: string; sourceUrl: string; subject: string; body: string; aiShare: number; fingerprint: string; runId: string }
export interface GmailStatus { configured: boolean; authorized: boolean; email: string | null }


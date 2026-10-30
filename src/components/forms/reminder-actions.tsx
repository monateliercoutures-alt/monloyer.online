'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';

export function GenerateRemindersButton({ leaseId }: { leaseId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await apiRequest<{ data: { created: number; skipped: number } }>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(leaseId ? { leaseId } : {}),
      });
      toast.success(`${result.data.created} relance(s) générée(s)`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Génération impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} loading={loading}>
      <RefreshCw className="size-4" /> Générer les relances dues
    </Button>
  );
}

export function SendReminderButton({
  reminderId,
  channel,
  phone,
  email,
}: {
  reminderId: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  phone: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await apiRequest<{
        data: { reminder: { message: string }; whatsappUrl: string | null; mailtoUrl: string | null };
      }>(`/api/reminders/${reminderId}/send`, { method: 'POST', body: JSON.stringify({}) });

      const { whatsappUrl, mailtoUrl, reminder } = result.data;
      if (whatsappUrl) window.open(whatsappUrl, '_blank');
      else if (mailtoUrl) window.location.href = mailtoUrl;
      else if (channel === 'SMS' && phone) {
        window.open(`sms:${phone}?body=${encodeURIComponent(reminder.message)}`, '_blank');
      } else if (email) {
        window.location.href = `mailto:${email}?body=${encodeURIComponent(reminder.message)}`;
      }

      toast.success('Relance marquée comme envoyée');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSend} loading={loading}>
      <Send className="size-4" /> Envoyer
    </Button>
  );
}

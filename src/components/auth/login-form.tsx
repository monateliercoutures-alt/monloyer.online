'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const [tab, setTab] = React.useState('email');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Connexion e-mail
  const [email, setEmail] = React.useState('admin@monloyer.ci');
  const [password, setPassword] = React.useState('Demo1234!');

  // Connexion téléphone (OTP)
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ redirect: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      toast.success('Connexion réussie');
      router.push(result.redirect);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await apiRequest<{ debugCode?: string; expiresInMinutes: number }>(
        '/api/auth/otp/request',
        { method: 'POST', body: JSON.stringify({ phone }) },
      );
      setCodeSent(true);
      setInfo(
        result.debugCode
          ? `Code de démonstration : ${result.debugCode} (valable ${result.expiresInMinutes} min)`
          : `Un code à 6 chiffres vous a été envoyé (valable ${result.expiresInMinutes} min).`,
      );
      if (result.debugCode) setCode(result.debugCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Envoi du code impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ redirect: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      toast.success('Connexion réussie');
      router.push(result.redirect);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">
            <Mail className="size-4" /> E-mail
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Smartphone className="size-4" /> Téléphone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <Field label="Adresse e-mail" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@agence.ci"
              />
            </Field>
            <Field label="Mot de passe" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" loading={loading}>
              <KeyRound className="size-4" /> Se connecter
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <form onSubmit={codeSent ? handleVerifyCode : handleRequestCode} className="space-y-4">
            <Field
              label="Numéro de téléphone"
              htmlFor="phone"
              hint="Format ivoirien : 07 00 00 00 00"
              required
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="07 08 11 22 33"
              />
            </Field>

            {codeSent ? (
              <Field label="Code à 6 chiffres" htmlFor="code" required>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="tracking-[0.4em]"
                />
              </Field>
            ) : null}

            {info ? (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" loading={loading}>
              {codeSent ? 'Valider le code' : 'Recevoir un code'}
            </Button>
            {codeSent ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCodeSent(false);
                  setInfo(null);
                  setCode('');
                }}
              >
                Changer de numéro
              </Button>
            ) : null}
          </form>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <Label className="text-xs">Comptes de démonstration</Label>
        </p>
        <p>admin@monloyer.ci · agent@monloyer.ci · comptable@monloyer.ci</p>
        <p>proprietaire@monloyer.ci · locataire@monloyer.ci</p>
        <p>Mot de passe : Demo1234!</p>
      </div>
    </div>
  );
}

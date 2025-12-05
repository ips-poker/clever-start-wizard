import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClanEmblemDisplay } from './ClanEmblemDisplay';
import { useClanSystem, ClanInvitation } from '@/hooks/useClanSystem';
import { Check, X, Mail, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ClanInvitationsPanel() {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useClanSystem();

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Приглашения в кланы
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {pendingInvitations.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {pendingInvitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              onAccept={() => acceptInvitation(invitation.id, invitation.clan_id)}
              onDecline={() => declineInvitation(invitation.id)}
            />
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function InvitationCard({
  invitation,
  onAccept,
  onDecline
}: {
  invitation: ClanInvitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept();
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    await onDecline();
    setIsProcessing(false);
  };

  const clan = invitation.clan;
  if (!clan) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex items-center gap-4 p-3 rounded-lg bg-card border mb-2 last:mb-0"
    >
      <ClanEmblemDisplay
        emblemId={clan.emblem_id}
        sealId={clan.seal_id}
        clanName={clan.name}
        size="sm"
        showName={false}
      />

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate">{clan.name}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {formatDistanceToNow(new Date(invitation.created_at), {
              addSuffix: true,
              locale: ru
            })}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleAccept}
          disabled={isProcessing}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isProcessing}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

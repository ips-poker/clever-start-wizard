import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClanCard } from './ClanCard';
import { ClanManagementModal } from './ClanManagementModal';
import { ClanCreationModal } from './ClanCreationModal';
import { useClanSystem } from '@/hooks/useClanSystem';
import { Crown, Shield, Plus, Sparkles } from 'lucide-react';

export function ClanManagementPanel() {
  const {
    myClan,
    myMembership,
    isDon,
    createClan,
  } = useClanSystem();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Если нет клана и игрок Дон - показываем кнопку создания
  if (!myClan && isDon) {
    return (
      <Card className="bg-gradient-to-br from-card via-secondary/30 to-card border-yellow-500/30 overflow-hidden">
        <CardContent className="pt-6 relative">
          {/* Декоративный фон */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary rounded-full blur-3xl" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 relative z-10"
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Crown className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            </motion.div>
            
            <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Создайте свой клан
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Вы достигли ранга <span className="text-yellow-500 font-semibold">Дон</span>! 
              Теперь вы можете создать свою семью и собрать команду до 20 игроков.
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={() => setShowCreateModal(true)} 
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/30"
              >
                <Plus className="w-5 h-5 mr-2" />
                Создать клан
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </motion.div>

          <ClanCreationModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            onCreateClan={createClan}
          />
        </CardContent>
      </Card>
    );
  }

  // Если нет клана и не Дон
  if (!myClan) {
    return (
      <Card className="bg-gradient-to-br from-card to-muted/30 border-border/50">
        <CardContent className="pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">Вы не состоите в клане</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Дождитесь приглашения от Дона или достигните ранга Дон,
              чтобы создать свой клан.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const isLeader = myMembership?.hierarchy_role === 'don';

  return (
    <>
      <ClanCard
        clan={myClan}
        onClick={() => setShowManageModal(true)}
        isLeader={isLeader}
      />
      
      <ClanManagementModal
        open={showManageModal}
        onOpenChange={setShowManageModal}
        clan={myClan}
        isLeader={isLeader}
      />
    </>
  );
}

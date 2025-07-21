import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trophy, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayoutStructureProps {
  tournamentId: string;
  registeredPlayers: number;
}

interface PayoutPlace {
  place: number;
  percentage: number;
  rp: number;
}

const PayoutStructure = ({ tournamentId, registeredPlayers }: PayoutStructureProps) => {
  const [payoutPlaces, setPayoutPlaces] = useState<PayoutPlace[]>([]);
  const [totalPrizePool, setTotalPrizePool] = useState(0);
  const [baseRP, setBaseRP] = useState(1000);
  const { toast } = useToast();

  useEffect(() => {
    calculateAutomaticPayouts();
  }, [registeredPlayers]);

  const calculateAutomaticPayouts = () => {
    if (registeredPlayers === 0) {
      setPayoutPlaces([]);
      setTotalPrizePool(0);
      return;
    }

    // Стандартное распределение призовых мест по покерным правилам
    let payoutPositions = 1;
    if (registeredPlayers >= 10) payoutPositions = Math.floor(registeredPlayers * 0.15);
    else if (registeredPlayers >= 6) payoutPositions = 2;
    else if (registeredPlayers >= 4) payoutPositions = 1;

    // Стандартные проценты для призовых мест
    const standardPercentages: { [key: number]: number[] } = {
      1: [100],
      2: [65, 35],
      3: [50, 30, 20],
      4: [40, 25, 20, 15],
      5: [35, 22, 18, 15, 10],
      6: [30, 20, 15, 12, 12, 11],
      7: [27, 18, 14, 11, 10, 10, 10],
      8: [25, 17, 13, 10, 9, 9, 9, 8],
      9: [23, 16, 12, 9, 8, 8, 8, 8, 8]
    };

    let percentages = standardPercentages[Math.min(payoutPositions, 9)] || [];
    
    // Если больше 9 мест, распределяем оставшийся процент равномерно
    if (payoutPositions > 9) {
      const remainingPercentage = 100 - percentages.reduce((sum, p) => sum + p, 0);
      const additionalPlaces = payoutPositions - 9;
      const equalShare = remainingPercentage / additionalPlaces;
      
      for (let i = 0; i < additionalPlaces; i++) {
        percentages.push(Math.round(equalShare * 100) / 100);
      }
    }

    // Базовый призовой фонд (базовый RP * количество игроков)
    const basePrizePool = baseRP * registeredPlayers;
    setTotalPrizePool(basePrizePool);

    // Создаем структуру выплат
    const payouts = percentages.map((percentage, index) => ({
      place: index + 1,
      percentage,
      rp: Math.round((basePrizePool * percentage) / 100)
    }));

    setPayoutPlaces(payouts);
  };

  const addPayoutPlace = () => {
    const newPlace = payoutPlaces.length + 1;
    const newPayout: PayoutPlace = {
      place: newPlace,
      percentage: 5,
      rp: Math.round((totalPrizePool * 5) / 100)
    };
    
    setPayoutPlaces([...payoutPlaces, newPayout]);
    recalculatePercentages([...payoutPlaces, newPayout]);
  };

  const removePayoutPlace = () => {
    if (payoutPlaces.length <= 1) return;
    
    const newPayouts = payoutPlaces.slice(0, -1);
    setPayoutPlaces(newPayouts);
    recalculatePercentages(newPayouts);
  };

  const recalculatePercentages = (payouts: PayoutPlace[]) => {
    // Автоматически перераспределяем проценты при изменении количества мест
    const totalPercentage = 100;
    const evenPercentage = totalPercentage / payouts.length;
    
    const updatedPayouts = payouts.map((payout, index) => {
      let adjustedPercentage = evenPercentage;
      
      // Первые места получают больший процент
      if (index === 0) adjustedPercentage = evenPercentage * 1.8;
      else if (index === 1) adjustedPercentage = evenPercentage * 1.4;
      else if (index === 2) adjustedPercentage = evenPercentage * 1.1;
      
      return {
        ...payout,
        percentage: Math.round(adjustedPercentage * 100) / 100,
        rp: Math.round((totalPrizePool * adjustedPercentage) / 100)
      };
    });

    // Нормализуем проценты, чтобы общая сумма была 100%
    const totalActualPercentage = updatedPayouts.reduce((sum, p) => sum + p.percentage, 0);
    const adjustmentFactor = 100 / totalActualPercentage;
    
    const normalizedPayouts = updatedPayouts.map(payout => ({
      ...payout,
      percentage: Math.round(payout.percentage * adjustmentFactor * 100) / 100,
      rp: Math.round((totalPrizePool * payout.percentage * adjustmentFactor) / 100)
    }));

    setPayoutPlaces(normalizedPayouts);
  };

  const updatePayoutPercentage = (index: number, newPercentage: number) => {
    const updatedPayouts = [...payoutPlaces];
    updatedPayouts[index] = {
      ...updatedPayouts[index],
      percentage: newPercentage,
      rp: Math.round((totalPrizePool * newPercentage) / 100)
    };
    setPayoutPlaces(updatedPayouts);
  };

  const getTotalPercentage = () => {
    return payoutPlaces.reduce((sum, payout) => sum + payout.percentage, 0);
  };

  const getTotalRP = () => {
    return payoutPlaces.reduce((sum, payout) => sum + payout.rp, 0);
  };

  return (
    <div className="space-y-6">
      {/* Настройки призового фонда */}
      <Card className="bg-white/50 border border-gray-200/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-800">
            <Calculator className="w-5 h-5" />
            Настройки призового фонда
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="registered_players">Зарегистрировано игроков</Label>
              <Input
                id="registered_players"
                type="number"
                value={registeredPlayers}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="base_rp">Базовый RP на игрока</Label>
              <Input
                id="base_rp"
                type="number"
                value={baseRP}
                onChange={(e) => {
                  const newRP = parseInt(e.target.value) || 1000;
                  setBaseRP(newRP);
                  setTotalPrizePool(newRP * registeredPlayers);
                }}
              />
            </div>
            <div>
              <Label htmlFor="total_prize">Общий призовой фонд (RP)</Label>
              <Input
                id="total_prize"
                type="number"
                value={totalPrizePool}
                disabled
                className="bg-gray-50 font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление количеством призовых мест */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-gray-800">Призовые места</h3>
          <p className="text-sm text-gray-600">
            Призовых мест: {payoutPlaces.length} из {registeredPlayers} игроков
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={removePayoutPlace}
            disabled={payoutPlaces.length <= 1}
            size="sm"
            variant="outline"
            className="bg-white/70"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            onClick={addPayoutPlace}
            disabled={payoutPlaces.length >= registeredPlayers}
            size="sm"
            variant="outline"
            className="bg-white/70"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={calculateAutomaticPayouts}
            size="sm"
            className="bg-gradient-button text-white"
          >
            Автоматический расчет
          </Button>
        </div>
      </div>

      {/* Таблица выплат */}
      {payoutPlaces.length > 0 && (
        <Card className="bg-white/50 border border-gray-200/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="text-gray-600 font-medium">Место</TableHead>
                  <TableHead className="text-gray-600 font-medium">Процент (%)</TableHead>
                  <TableHead className="text-gray-600 font-medium">Рейтинг Поинтс (RP)</TableHead>
                  <TableHead className="text-gray-600 font-medium">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutPlaces.map((payout, index) => (
                  <TableRow key={payout.place} className="border-gray-200/50 hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {index < 3 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        {payout.place} место
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={payout.percentage}
                        onChange={(e) => updatePayoutPercentage(index, parseFloat(e.target.value) || 0)}
                        className="w-20"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">
                      {payout.rp.toLocaleString()} RP
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {(payout.rp / totalPrizePool * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Итоговая статистика */}
      {payoutPlaces.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {getTotalPercentage().toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Общий процент</div>
                {getTotalPercentage() !== 100 && (
                  <Badge variant="destructive" className="mt-1">
                    Не равно 100%
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {getTotalRP().toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">RP к выплате</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {((getTotalRP() / totalPrizePool) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">От призового фонда</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutStructure;
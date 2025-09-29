import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, CheckCircle } from "lucide-react";

export function LegalTerminologyInfo() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center text-blue-800">
          <Info className="w-5 h-5 mr-2" />
          Обновленная терминология согласно договору оферты
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-800 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Правильная терминология
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium">Организационный взнос</span>
                <Badge variant="outline" className="text-green-700">
                  Услуги по организации досуга
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium">Повторный вход</span>
                <Badge variant="outline" className="text-green-700">
                  Дополнительная аренда набора
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium">Дополнительный набор</span>
                <Badge variant="outline" className="text-green-700">
                  Дополнительный стандартный набор
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium">Игровой инвентарь</span>
                <Badge variant="outline" className="text-green-700">
                  Фишки для ведения счета
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium">RPS баллы</span>
                <Badge variant="outline" className="text-green-700">
                  Рейтинговые баллы (1000₽ = 100 RPS)
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-red-800 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Избегаем (покерная терминология)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                <span className="line-through text-gray-500">Бай-ин</span>
                <Badge variant="destructive" className="text-xs">
                  Не используем
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                <span className="line-through text-gray-500">Ребай</span>
                <Badge variant="destructive" className="text-xs">
                  Не используем
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                <span className="line-through text-gray-500">Адд-он</span>
                <Badge variant="destructive" className="text-xs">
                  Не используем
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                <span className="line-through text-gray-500">Призовой фонд</span>
                <Badge variant="destructive" className="text-xs">
                  Не используем
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                <span className="line-through text-gray-500">Рубли в призах</span>
                <Badge variant="destructive" className="text-xs">
                  Только RPS баллы
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-2">
            Соответствие договору оферты
          </h4>
          <p className="text-sm text-amber-700">
            Все термины теперь соответствуют документам: услуги по организации досуга, 
            аренда игрового инвентаря, организационные взносы. 
            Призы выдаются только в виде RPS баллов, без денежного эквивалента.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
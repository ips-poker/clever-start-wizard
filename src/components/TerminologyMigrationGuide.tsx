import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, FileText, ExternalLink } from "lucide-react";
import { LegalTerminologyInfo } from "./LegalTerminologyInfo";

export function TerminologyMigrationGuide() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center text-amber-800">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Миграция терминологии завершена
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium">База данных обновлена</span>
            <Badge variant="outline" className="text-green-700">
              Новые поля добавлены
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium">Компоненты обновлены</span>
            <Badge variant="outline" className="text-green-700">
              Соответствуют договору оферты
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium">RPS система внедрена</span>
            <Badge variant="outline" className="text-green-700">
              1000₽ = 100 RPS баллов
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Документы обновлены</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/terms" target="_blank" className="flex items-center">
                  Договор оферты
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/privacy" target="_blank" className="flex items-center">
                  Политика конфиденциальности
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LegalTerminologyInfo />

      <Card>
        <CardHeader>
          <CardTitle>Основные изменения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">База данных</h4>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>• participation_fee (организационный взнос)</li>
                <li>• reentry_fee (повторный вход)</li>
                <li>• additional_fee (дополнительный набор)</li>
                <li>• rps_points (RPS баллы)</li>
                <li>• Новые функции расчета</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Интерфейс</h4>
              <ul className="text-sm space-y-1 text-green-700">
                <li>• Организационные взносы</li>
                <li>• Аренда игрового инвентаря</li>
                <li>• Фонд RPS баллов</li>
                <li>• Повторные входы</li>
                <li>• Дополнительные наборы</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">Расчеты</h4>
              <ul className="text-sm space-y-1 text-purple-700">
                <li>• Конвертация ₽ → RPS</li>
                <li>• Автоматический расчет фонда</li>
                <li>• Распределение по местам</li>
                <li>• Новая рейтинговая система</li>
                <li>• Pool-based подход</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">
              Важно: Соответствие законодательству
            </h4>
            <p className="text-sm text-yellow-700">
              Все изменения направлены на соответствие договору оферты и российскому законодательству. 
              Турниры теперь описываются как "услуги по организации досуга" с "арендой игрового инвентаря", 
              а призы выдаются исключительно в виде RPS баллов без денежного эквивалента.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
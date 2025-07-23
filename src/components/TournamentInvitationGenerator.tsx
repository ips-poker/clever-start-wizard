import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, DollarSign, Trophy, Users, Download, Eye } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TournamentData {
  title: string;
  date: string;
  time: string;
  location: string;
  address: string;
  buyIn: string;
  format: string;
  description: string;
  rebuyInfo: string;
  contactInfo: string;
}

export function TournamentInvitationGenerator() {
  const [tournamentData, setTournamentData] = useState<TournamentData>({
    title: "Рейтинговый турнир по покеру",
    date: "30.07.2025",
    time: "18:00",
    location: "TNG Lounge",
    address: "г. Москва, Фридриха Энгельса, 64 стр 1",
    buyIn: "2000 руб",
    format: "Турнир с ребаями",
    description: "Присоединяйтесь к элитному покерному турниру с рейтинговой системой",
    rebuyInfo: "Возможность ребая до 6-го уровня",
    contactInfo: "Телеграм: @ips_poker"
  });

  const [showPreview, setShowPreview] = useState(false);

  const updateField = (field: keyof TournamentData, value: string) => {
    setTournamentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePDF = async () => {
    const element = document.getElementById('invitation-preview');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`poker-tournament-invitation-${tournamentData.date.replace(/\./g, '-')}.pdf`);
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название турнира</Label>
            <Input
              id="title"
              value={tournamentData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                value={tournamentData.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Время</Label>
              <Input
                id="time"
                value={tournamentData.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Место проведения</Label>
            <Input
              id="location"
              value={tournamentData.location}
              onChange={(e) => updateField('location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={tournamentData.address}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buyIn">Бай-ин</Label>
            <Input
              id="buyIn"
              value={tournamentData.buyIn}
              onChange={(e) => updateField('buyIn', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Формат турнира</Label>
            <Select value={tournamentData.format} onValueChange={(value) => updateField('format', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Турнир с ребаями">Турнир с ребаями</SelectItem>
                <SelectItem value="Фризаут">Фризаут</SelectItem>
                <SelectItem value="Турбо">Турбо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rebuyInfo">Информация о ребаях</Label>
            <Input
              id="rebuyInfo"
              value={tournamentData.rebuyInfo}
              onChange={(e) => updateField('rebuyInfo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={tournamentData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo">Контактная информация</Label>
            <Input
              id="contactInfo"
              value={tournamentData.contactInfo}
              onChange={(e) => updateField('contactInfo', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Eye size={16} />
          {showPreview ? 'Скрыть превью' : 'Показать превью'}
        </Button>
        <Button
          onClick={generatePDF}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          Скачать PDF
        </Button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Превью приглашения</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="invitation-preview" className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {tournamentData.title}
                </h1>
                <p className="text-lg text-gray-600">
                  International Poker Style
                </p>
              </div>

              {/* Main Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Дата и время</p>
                        <p className="text-gray-700">{tournamentData.date} в {tournamentData.time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{tournamentData.location}</p>
                        <p className="text-gray-700 text-sm">{tournamentData.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Бай-ин</p>
                        <p className="text-gray-700 text-xl font-bold">{tournamentData.buyIn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Формат</p>
                        <Badge variant="secondary">{tournamentData.format}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">О турнире</h2>
                <p className="text-gray-700 leading-relaxed">
                  {tournamentData.description}
                </p>
              </div>

              {/* Additional Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Важная информация</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• {tournamentData.rebuyInfo}</li>
                  <li>• Рейтинговый турнир - влияет на общий рейтинг игроков</li>
                  <li>• Призовой фонд распределяется согласно структуре выплат</li>
                  <li>• Регистрация на месте или онлайн</li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="text-center border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-2">Для регистрации и вопросов:</p>
                <p className="font-semibold text-gray-900">{tournamentData.contactInfo}</p>
                <div className="mt-4 text-xs text-gray-500">
                  Генерировано: {new Date().toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LegalDocumentProps {
  title: string;
  content: React.ReactNode;
}

export function LegalDocument({ title, content }: LegalDocumentProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="shadow-lg">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl lg:text-3xl font-bold text-primary">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 lg:p-8">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
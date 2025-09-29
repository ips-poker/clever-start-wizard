import React from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PrivacyConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function PrivacyConsent({ checked, onCheckedChange, disabled, className }: PrivacyConsentProps) {
  return (
    <div className={`flex items-start space-x-2 ${className}`}>
      <Checkbox
        id="privacy-consent"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
        required
      />
      <Label 
        htmlFor="privacy-consent" 
        className="text-sm leading-relaxed cursor-pointer flex-1"
      >
        Я согласен с{" "}
        <Link 
          to="/privacy" 
          target="_blank"
          className="text-primary hover:underline font-medium"
        >
          Политикой конфиденциальности
        </Link>
        {" "}и{" "}
        <Link 
          to="/terms" 
          target="_blank"
          className="text-primary hover:underline font-medium"
        >
          Договором оферты
        </Link>
        , даю согласие на обработку персональных данных
      </Label>
    </div>
  );
}
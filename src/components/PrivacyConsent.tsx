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
    <div className={`flex items-start space-x-3 ${className}`}>
      <Checkbox
        id="privacy-consent"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-1 h-5 w-5 border-2 border-amber-400/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
        required
      />
      <Label 
        htmlFor="privacy-consent" 
        className="text-sm leading-relaxed cursor-pointer flex-1 text-slate-200 font-medium"
      >
        Я согласен с{" "}
        <Link 
          to="/privacy" 
          target="_blank"
          className="text-amber-400 hover:text-amber-300 hover:underline font-semibold"
        >
          Политикой конфиденциальности
        </Link>
        {" "}и{" "}
        <Link 
          to="/terms" 
          target="_blank"
          className="text-amber-400 hover:text-amber-300 hover:underline font-semibold"
        >
          Договором оферты
        </Link>
        , даю согласие на обработку персональных данных
      </Label>
    </div>
  );
}
"use client";

import { APP_THEME_ORDER, APP_THEMES } from "@/lib/themes";
import { APP_ICONS } from "@/lib/ui/appIcons";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";
import type { AppThemeId } from "@/lib/themes/types";

type ThemePickerProps = {
  themeId: AppThemeId;
  onThemeChange: (id: AppThemeId) => void;
};

export default function ThemePicker({ themeId, onThemeChange }: ThemePickerProps) {
  return (
    <FantasyTooltipWrap label="Scene theme" hint="Choose the visual scene for the whole app" placement="below">
      <label className="theme-picker">
        <span className="theme-picker-icon" aria-hidden="true">
          {APP_ICONS.scene}
        </span>
        <span className="theme-picker-label font-display">Scene</span>
        <select
          value={themeId}
          onChange={(e) => onThemeChange(e.target.value as AppThemeId)}
          aria-label="App scene theme"
          className="theme-picker-select font-display"
        >
          {APP_THEME_ORDER.map((id) => (
            <option key={id} value={id}>
              {APP_THEMES[id].icon} {APP_THEMES[id].label}
            </option>
          ))}
        </select>
      </label>
    </FantasyTooltipWrap>
  );
}

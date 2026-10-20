'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type {
  WatermarkFullConfig,
  GridPosition,
  FrameStyle,
  WatermarkPreset,
} from '@/types/watermark';
import { WATERMARK_PRESETS } from '@/data/presets';
import { CURATED_FONTS, FONT_CATEGORIES, FONT_SIZE_PRESETS } from '@/data/fonts';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface InspectorPanelProps {
  config: WatermarkFullConfig;
  onChange: (updated: WatermarkFullConfig) => void;
  onApplyPreset: (preset: WatermarkPreset) => void;
}

type TabKey = 'text' | 'logo' | 'frame' | 'position' | 'presets';

export function InspectorPanel({ config, onChange, onApplyPreset }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('text');

  // Update text partial
  const updateText = (partial: Partial<WatermarkFullConfig['text']>) => {
    onChange({
      ...config,
      text: { ...config.text, ...partial },
    });
  };

  // Update logo partial
  const updateLogo = (partial: Partial<WatermarkFullConfig['logo']>) => {
    onChange({
      ...config,
      logo: { ...config.logo, ...partial },
    });
  };

  // Update frame partial
  const updateFrame = (partial: Partial<WatermarkFullConfig['frame']>) => {
    onChange({
      ...config,
      frame: { ...config.frame, ...partial },
    });
  };

  // Update position
  const updatePosition = (grid: GridPosition) => {
    onChange({
      ...config,
      text: {
        ...config.text,
        position: { ...config.text.position, grid },
      },
      logo: {
        ...config.logo,
        position: { ...config.logo.position, grid },
      },
    });
  };

  const updateOffsets = (offsetX: number, offsetY: number) => {
    onChange({
      ...config,
      text: {
        ...config.text,
        position: { ...config.text.position, offsetX, offsetY },
      },
      logo: {
        ...config.logo,
        position: { ...config.logo.position, offsetX, offsetY },
      },
    });
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (config.logo.logoUrl && config.logo.logoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(config.logo.logoUrl);
    }
    const url = URL.createObjectURL(file);
    updateLogo({
      enabled: true,
      logoUrl: url,
      fileName: file.name,
    });
  };

  const removeLogo = () => {
    if (config.logo.logoUrl) {
      URL.revokeObjectURL(config.logo.logoUrl);
    }
    updateLogo({
      enabled: false,
      logoUrl: null,
      fileName: null,
    });
  };

  const GRID_POSITIONS: { id: GridPosition; label: string }[] = [
    { id: 'top-left', label: '↖ Kiri Atas' },
    { id: 'top-center', label: '↑ Tengah Atas' },
    { id: 'top-right', label: '↗ Kanan Atas' },
    { id: 'middle-left', label: '← Tengah Kiri' },
    { id: 'center', label: '• Tengah' },
    { id: 'middle-right', label: '→ Tengah Kanan' },
    { id: 'bottom-left', label: '↙ Kiri Bawah' },
    { id: 'bottom-center', label: '↓ Tengah Bawah' },
    { id: 'bottom-right', label: '↘ Kanan Bawah' },
  ];

  const FRAME_STYLES: { id: FrameStyle; label: string }[] = [
    { id: 'none', label: 'Tanpa Bingkai' },
    { id: 'solid', label: 'Garis Penuh' },
    { id: 'double', label: 'Garis Ganda' },
    { id: 'dashed', label: 'Putus-putus' },
    { id: 'card', label: 'Polaroid Card' },
    { id: 'banner', label: 'Banner Bawah' },
  ];

  return (
    <div className="flex flex-col h-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
      {/* Inspector Tab Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 p-1">
        {(
          [
            { id: 'text', label: 'Teks', icon: 'T' },
            { id: 'logo', label: 'Logo', icon: '🖼' },
            { id: 'frame', label: 'Bingkai', icon: '◻' },
            { id: 'position', label: 'Posisi', icon: '✛' },
            { id: 'presets', label: 'Preset', icon: '✨' },
          ] as { id: TabKey; label: string; icon: string }[]
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-background text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: TEKS */}
        {activeTab === 'text' ? (
          <div className="space-y-4">
            <Switch
              label="Aktifkan Watermark Teks"
              description="Tambahkan tanda tangan teks atau hak cipta"
              checked={config.text.enabled}
              onChange={(enabled) => updateText({ enabled })}
            />

            {config.text.enabled ? (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">
                    Isi Teks Watermark
                  </label>
                  <input
                    type="text"
                    value={config.text.text}
                    onChange={(e) => updateText({ text: e.target.value })}
                    placeholder="Contoh: © 2026 Studio Anda"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Categorized Font Family Selector & Live Sample Strip */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/90">
                      Jenis Font Watermark
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      10+ Curated Fonts
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={config.text.fontFamily}
                      onChange={(e) => updateText({ fontFamily: e.target.value })}
                      className="w-full h-10 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 cursor-pointer transition-colors"
                    >
                      {FONT_CATEGORIES.map((cat) => {
                        const catFonts = CURATED_FONTS.filter((f) => f.category === cat.id);
                        return (
                          <optgroup key={cat.id} label={`── ${cat.label} ──`}>
                            {catFonts.map((font) => (
                              <option key={font.id} value={font.family}>
                                {font.name} — {font.sampleText}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  {/* Live Font Sample Strip */}
                  <div className="mt-1 px-3 py-2 rounded-md bg-secondary/50 border border-border/50 flex items-center justify-between overflow-hidden">
                    <span className="text-[11px] text-muted-foreground shrink-0 mr-2">Pratinjau Font:</span>
                    <span
                      className="text-sm font-semibold text-foreground truncate max-w-[200px]"
                      style={{ fontFamily: config.text.fontFamily }}
                    >
                      {config.text.text || 'MarkIt Studio Preview'}
                    </span>
                  </div>
                </div>

                {/* Ukuran Font Relatif (Linear Font Sizing 0.5% - 30.0%) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-foreground">Ukuran Font Relatif</label>
                      <p className="text-[10px] text-muted-foreground">Persentase terhadap dimensi minimum media</p>
                    </div>
                    <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-0.5 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500">
                      <input
                        type="number"
                        min={0.5}
                        max={30.0}
                        step={0.1}
                        value={config.text.fontSize}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updateText({ fontSize: Math.min(30.0, Math.max(0.5, parseFloat(val.toFixed(1)))) });
                          }
                        }}
                        className="w-12 text-right text-xs font-mono font-bold text-foreground bg-transparent focus:outline-none"
                      />
                      <span className="text-xs font-mono text-muted-foreground select-none">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0.5}
                    max={30.0}
                    step={0.1}
                    value={config.text.fontSize}
                    onChange={(e) => updateText({ fontSize: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    style={{
                      background: `linear-gradient(to right, #4f46e5 ${
                        ((config.text.fontSize - 0.5) / (30.0 - 0.5)) * 100
                      }%, var(--secondary) ${
                        ((config.text.fontSize - 0.5) / (30.0 - 0.5)) * 100
                      }%)`,
                    }}
                  />

                  {/* 5 Discrete Quick Preset Pills */}
                  <div
                    className="grid grid-cols-5 gap-1.5 pt-1"
                    role="radiogroup"
                    aria-label="Preset ukuran font relatif watermark"
                  >
                    {FONT_SIZE_PRESETS.map((preset) => {
                      const isSelected = Math.abs(config.text.fontSize - preset.value) < 0.05;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Ukuran ${preset.label} ${preset.value} persen`}
                          onClick={() => updateText({ fontSize: preset.value })}
                          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-xs font-semibold'
                              : 'bg-background hover:bg-secondary/70 text-foreground border-border/70 hover:border-border text-muted-foreground'
                          }`}
                        >
                          <span className="text-[11px] leading-none">{preset.label}</span>
                          <span
                            className={`text-[9px] font-mono mt-0.5 ${
                              isSelected ? 'text-white/90' : 'text-muted-foreground'
                            }`}
                          >
                            {preset.value.toFixed(1)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Slider
                  label="Opasitas / Transparansi"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  unit=""
                  value={config.text.opacity}
                  onChange={(opacity) => updateText({ opacity })}
                />

                <Slider
                  label="Sudut Rotasi"
                  min={-180}
                  max={180}
                  step={5}
                  unit="°"
                  value={config.text.rotation}
                  onChange={(rotation) => updateText({ rotation })}
                />

                <ColorPicker
                  label="Warna Teks"
                  value={config.text.color}
                  onChange={(color) => updateText({ color })}
                />

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                  <Switch
                    label="Bayangan (Shadow)"
                    checked={config.text.shadow}
                    onChange={(shadow) => updateText({ shadow })}
                  />
                  <Switch
                    label="Garis Tepi (Stroke)"
                    checked={config.text.stroke}
                    onChange={(stroke) => updateText({ stroke })}
                  />
                </div>

                <div className="pt-2 border-t border-border/50 space-y-3">
                  <Switch
                    label="Pola Ubin Berulang (Tile)"
                    description="Pola diagonal anti-cropping di seluruh kanvas"
                    checked={config.text.tile}
                    onChange={(tile) => updateText({ tile })}
                  />
                  {config.text.tile ? (
                    <Slider
                      label="Kerapatan Ubin"
                      min={60}
                      max={240}
                      step={10}
                      unit="px"
                      value={config.text.tileSpacing}
                      onChange={(tileSpacing) => updateText({ tileSpacing })}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 2: LOGO */}
        {activeTab === 'logo' ? (
          <div className="space-y-4">
            <Switch
              label="Aktifkan Watermark Logo"
              description="Gunakan file logo transparan Anda (PNG / SVG)"
              checked={config.logo.enabled}
              onChange={(enabled) => updateLogo({ enabled })}
            />

            {config.logo.enabled ? (
              <div className="space-y-4 pt-2 border-t border-border/50">
                {config.logo.logoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                    <div className="relative w-12 h-12 rounded bg-black/10 flex items-center justify-center overflow-hidden border border-border/60">
                      <Image
                        src={config.logo.logoUrl}
                        alt="Logo Preview"
                        width={48}
                        height={48}
                        unoptimized
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium truncate text-foreground">
                        {config.logo.fileName || 'Logo Aktif'}
                      </p>
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="text-[11px] text-destructive hover:underline cursor-pointer mt-0.5"
                      >
                        Hapus Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-secondary/40 transition-colors">
                    <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-foreground">Pilih File Logo</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">PNG atau SVG transparan direkomendasikan</span>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}

                <Slider
                  label="Ukuran Logo (%)"
                  min={5}
                  max={60}
                  step={1}
                  unit="%"
                  value={config.logo.scale}
                  onChange={(scale) => updateLogo({ scale })}
                />

                <Slider
                  label="Opasitas Logo"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={config.logo.opacity}
                  onChange={(opacity) => updateLogo({ opacity })}
                />

                <Slider
                  label="Rotasi Logo"
                  min={-180}
                  max={180}
                  step={5}
                  unit="°"
                  value={config.logo.rotation}
                  onChange={(rotation) => updateLogo({ rotation })}
                />

                <Switch
                  label="Pola Ubin Logo (Tile)"
                  description="Ulangi logo di seluruh permukaan media"
                  checked={config.logo.tile}
                  onChange={(tile) => updateLogo({ tile })}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 3: BINGKAI / FRAME */}
        {activeTab === 'frame' ? (
          <div className="space-y-4">
            <Switch
              label="Aktifkan Bingkai / Frame"
              description="Beri sentuhan border artistik atau metadata banner"
              checked={config.frame.enabled}
              onChange={(enabled) => updateFrame({ enabled })}
            />

            {config.frame.enabled ? (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">
                    Gaya Bingkai
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRAME_STYLES.map((fs) => {
                      const isSelected = config.frame.style === fs.id;
                      return (
                        <button
                          key={fs.id}
                          type="button"
                          onClick={() => updateFrame({ style: fs.id })}
                          className={`p-2 rounded-lg text-xs font-medium border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'border-border/60 hover:bg-secondary text-muted-foreground'
                          }`}
                        >
                          {fs.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Slider
                  label="Ketebalan Bingkai (%)"
                  min={0.5}
                  max={8}
                  step={0.2}
                  unit="%"
                  value={config.frame.borderWidth}
                  onChange={(borderWidth) => updateFrame({ borderWidth })}
                />

                <Slider
                  label="Jarak Inset (Padding)"
                  min={0}
                  max={8}
                  step={0.5}
                  unit="%"
                  value={config.frame.padding}
                  onChange={(padding) => updateFrame({ padding })}
                />

                <ColorPicker
                  label="Warna Bingkai"
                  value={config.frame.borderColor}
                  onChange={(borderColor) => updateFrame({ borderColor })}
                />

                {config.frame.style === 'banner' || config.frame.style === 'card' ? (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <label className="text-xs font-medium text-foreground/80">
                      Teks Metadata Banner
                    </label>
                    <input
                      type="text"
                      value={config.frame.metaText}
                      onChange={(e) => updateFrame({ metaText: e.target.value })}
                      placeholder="Contoh: Shot on MarkIt • 50mm f/1.8"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <ColorPicker
                      label="Warna Teks Metadata"
                      value={config.frame.metaColor}
                      onChange={(metaColor) => updateFrame({ metaColor })}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 4: POSISI 9-GRID */}
        {activeTab === 'position' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground/80 block mb-2">
                Pilih Titik Posisi Watermark
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GRID_POSITIONS.map((pos) => {
                  const isSelected = config.text.position.grid === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updatePosition(pos.id)}
                      className={`h-12 rounded-lg border text-xs font-medium flex items-center justify-center text-center p-1 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold ring-2 ring-indigo-500/30'
                          : 'border-border/60 hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-3">
              <span className="text-xs font-medium text-foreground/80 block">
                Penyesuaian Offset Presisi
              </span>
              <Slider
                label="Offset Horisontal (X)"
                min={-40}
                max={40}
                step={1}
                unit="%"
                value={config.text.position.offsetX}
                onChange={(offsetX) => updateOffsets(offsetX, config.text.position.offsetY)}
              />
              <Slider
                label="Offset Vertikal (Y)"
                min={-40}
                max={40}
                step={1}
                unit="%"
                value={config.text.position.offsetY}
                onChange={(offsetY) => updateOffsets(config.text.position.offsetX, offsetY)}
              />
            </div>
          </div>
        ) : null}

        {/* TAB 5: PRESETS */}
        {activeTab === 'presets' ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pilih salah satu template preset di bawah untuk menerapkan konfigurasi watermark siap pakai.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {WATERMARK_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl border border-border/70 hover:border-indigo-500/60 bg-secondary/20 hover:bg-secondary/50 transition-all flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {preset.name}
                      </span>
                      <Badge variant="brand" className="text-[10px]">
                        {preset.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPreset(preset)}
                    className="w-full text-xs h-7 mt-1 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  >
                    Terapkan Preset Ini
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

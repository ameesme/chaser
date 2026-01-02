import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { EffectPreset, PresetStorage } from '@chaser/types';

/**
 * PresetManager - Manages effect presets stored in JSON file
 */
export class PresetManager {
  private presetsPath: string;
  private presets: Map<string, EffectPreset> = new Map();
  private version: string = '1.0';

  constructor(presetsPath: string) {
    this.presetsPath = presetsPath;
    this.load();
  }

  /**
   * Load presets from JSON file
   */
  load(): void {
    try {
      if (!existsSync(this.presetsPath)) {
        console.log('📋 Presets file not found, creating with defaults...');
        this.initializeDefaults();
        return;
      }

      const data = readFileSync(this.presetsPath, 'utf-8');
      const storage: PresetStorage = JSON.parse(data);

      this.version = storage.version || '1.0';
      this.presets.clear();

      storage.presets.forEach(preset => {
        this.presets.set(preset.id, preset);
      });

      console.log(`✅ Loaded ${this.presets.size} presets from ${this.presetsPath}`);
    } catch (error) {
      console.error('❌ Failed to load presets, initializing with defaults:', error);
      this.initializeDefaults();
    }
  }

  /**
   * Save presets to JSON file
   */
  save(): void {
    try {
      const storage: PresetStorage = {
        version: this.version,
        presets: Array.from(this.presets.values())
      };

      writeFileSync(this.presetsPath, JSON.stringify(storage, null, 2), 'utf-8');
      console.log(`💾 Saved ${this.presets.size} presets to ${this.presetsPath}`);
    } catch (error) {
      console.error('❌ Failed to save presets:', error);
      throw error;
    }
  }

  /**
   * Initialize with default presets
   */
  private initializeDefaults(): void {
    const defaultPresets: EffectPreset[] = [
      {
        id: 'sequential-ww',
        name: 'Sequential / WW',
        effect: 'sequential',
        topology: 'linear',
        params: {
          colorPreset: 'warm',
          delayBetweenPanels: 200,
          fadeDuration: 1050,
          brightness: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'sequential-cw',
        name: 'Sequential / CW',
        effect: 'sequential',
        topology: 'linear',
        params: {
          colorPreset: 'white',
          delayBetweenPanels: 200,
          fadeDuration: 1050,
          brightness: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'flow-slow-rainbow',
        name: 'Flow / Slow rainbow',
        effect: 'flow',
        topology: 'linear',
        params: {
          colorPreset: 'rainbow',
          speed: 0.1,
          scale: 0.15,
          brightness: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'strobe-10hz',
        name: 'Strobe / 10hz',
        effect: 'strobe',
        topology: 'circular',
        params: {
          colorPreset: 'white',
          frequency: 10,
          brightness: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'blackout-quick',
        name: 'Blackout - Quick',
        effect: 'blackout',
        topology: 'circular',
        params: {
          transitionDuration: 300
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'blackout-instant',
        name: 'Blackout / Instant',
        effect: 'blackout',
        topology: 'circular',
        params: {
          transitionDuration: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      },
      {
        id: 'flow-quick-chase',
        name: 'Flow / Quick Chase',
        effect: 'flow',
        topology: 'linear',
        params: {
          colorPreset: 'breathe',
          speed: 0.8,
          scale: 0.4,
          brightness: 1
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isProtected: true
      }
    ];

    defaultPresets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });

    this.save();
    console.log(`✅ Initialized with ${defaultPresets.length} default presets`);
  }

  /**
   * Sanitize user-provided ID to safe format
   */
  sanitizeId(rawId: string): string {
    return rawId
      .toLowerCase()                    // Convert to lowercase
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '')      // Remove non-alphanumeric except hyphens
      .replace(/-+/g, '-')             // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '');        // Trim leading/trailing hyphens
  }

  /**
   * Create a new preset
   */
  create(preset: Omit<EffectPreset, 'createdAt' | 'updatedAt' | 'isProtected'>): EffectPreset {
    // Sanitize ID
    const sanitizedId = this.sanitizeId(preset.id);

    if (!sanitizedId) {
      throw new Error('Invalid preset ID: ID cannot be empty after sanitization');
    }

    // Check for collision
    if (this.presets.has(sanitizedId)) {
      throw new Error(`Preset with ID "${sanitizedId}" already exists`);
    }

    const now = Date.now();
    const newPreset: EffectPreset = {
      ...preset,
      id: sanitizedId,
      createdAt: now,
      updatedAt: now,
      isProtected: false
    };

    this.presets.set(sanitizedId, newPreset);
    this.save();

    console.log(`✅ Created preset: ${newPreset.name} (${sanitizedId})`);
    return newPreset;
  }

  /**
   * Update an existing preset
   */
  update(id: string, updates: Partial<EffectPreset>): EffectPreset | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    // Don't allow updating protected presets
    if (preset.isProtected) {
      throw new Error(`Cannot update protected preset: ${preset.name}`);
    }

    // Don't allow changing ID or isProtected
    const { id: _, isProtected: __, createdAt: ___, ...allowedUpdates } = updates;

    const updatedPreset: EffectPreset = {
      ...preset,
      ...allowedUpdates,
      updatedAt: Date.now()
    };

    this.presets.set(id, updatedPreset);
    this.save();

    console.log(`✅ Updated preset: ${updatedPreset.name} (${id})`);
    return updatedPreset;
  }

  /**
   * Delete a preset
   */
  delete(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) {
      return false;
    }

    // Don't allow deleting protected presets
    if (preset.isProtected) {
      throw new Error(`Cannot delete protected preset: ${preset.name}`);
    }

    this.presets.delete(id);
    this.save();

    console.log(`🗑️ Deleted preset: ${preset.name} (${id})`);
    return true;
  }

  /**
   * Get a preset by ID
   */
  get(id: string): EffectPreset | null {
    return this.presets.get(id) || null;
  }

  /**
   * Get all presets
   */
  getAll(): EffectPreset[] {
    return Array.from(this.presets.values());
  }
}

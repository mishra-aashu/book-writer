export interface ThemeColors {
  '--accent-primary': string;
  '--accent-secondary': string;
  '--accent-hover': string;
  '--accent-glow': string;
  // Optional background overrides for custom theme feels
  '--bg-app'?: string;
  '--bg-sidebar'?: string;
  '--bg-card'?: string;
  '--bg-editor'?: string;
  '--text-primary'?: string;
  '--text-secondary'?: string;
  '--border-color'?: string;
}

export interface ThemePreset {
  key: string;
  name: string;
  description: string;
  colors: {
    dark: ThemeColors;
    light: ThemeColors;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'obsidian-royal',
    name: 'Obsidian Royal',
    description: 'Classic matte dark with premium deep purple accents',
    colors: {
      dark: {
        '--accent-primary': '#8b5cf6',
        '--accent-secondary': '#c084fc',
        '--accent-hover': '#7c3aed',
        '--accent-glow': 'rgba(139, 92, 246, 0.15)',
      },
      light: {
        '--accent-primary': '#7c3aed',
        '--accent-secondary': '#a855f7',
        '--accent-hover': '#6d28d9',
        '--accent-glow': 'rgba(124, 58, 237, 0.15)',
      }
    }
  },
  {
    key: 'emerald-velvet',
    name: 'Emerald Velvet',
    description: 'Sophisticated botanical forest greens and jade tones',
    colors: {
      dark: {
        '--accent-primary': '#10b981',
        '--accent-secondary': '#34d399',
        '--accent-hover': '#059669',
        '--accent-glow': 'rgba(16, 185, 129, 0.15)',
      },
      light: {
        '--accent-primary': '#059669',
        '--accent-secondary': '#10b981',
        '--accent-hover': '#047857',
        '--accent-glow': 'rgba(5, 150, 105, 0.15)',
      }
    }
  },
  {
    key: 'lavender-mist',
    name: 'Lavender Mist',
    description: 'Dreamy, ethereal twilight purple and pastel aura',
    colors: {
      dark: {
        '--accent-primary': '#a78bfa',
        '--accent-secondary': '#ddd6fe',
        '--accent-hover': '#8b5cf6',
        '--accent-glow': 'rgba(167, 139, 250, 0.15)',
      },
      light: {
        '--accent-primary': '#6366f1',
        '--accent-secondary': '#818cf8',
        '--accent-hover': '#4f46e5',
        '--accent-glow': 'rgba(99, 102, 241, 0.15)',
      }
    }
  },
  {
    key: 'amber-autumn',
    name: 'Amber Autumn',
    description: 'Cozy, warm golden woods and amber leaf gradients',
    colors: {
      dark: {
        '--accent-primary': '#f59e0b',
        '--accent-secondary': '#fbbf24',
        '--accent-hover': '#d97706',
        '--accent-glow': 'rgba(245, 158, 11, 0.15)',
      },
      light: {
        '--accent-primary': '#d97706',
        '--accent-secondary': '#f59e0b',
        '--accent-hover': '#b45309',
        '--accent-glow': 'rgba(217, 119, 6, 0.15)',
      }
    }
  },
  {
    key: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'High contrast electronic neon pinks and digital cyans',
    colors: {
      dark: {
        '--accent-primary': '#ec4899',
        '--accent-secondary': '#22d3ee',
        '--accent-hover': '#db2777',
        '--accent-glow': 'rgba(236, 72, 153, 0.15)',
      },
      light: {
        '--accent-primary': '#db2777',
        '--accent-secondary': '#06b6d4',
        '--accent-hover': '#be185d',
        '--accent-glow': 'rgba(219, 39, 119, 0.15)',
      }
    }
  },
  {
    key: 'crimson-rose',
    name: 'Crimson Rose',
    description: 'Deep romantic crimson and dark gothic rose colors',
    colors: {
      dark: {
        '--accent-primary': '#f43f5e',
        '--accent-secondary': '#fda4af',
        '--accent-hover': '#e11d48',
        '--accent-glow': 'rgba(244, 63, 94, 0.15)',
      },
      light: {
        '--accent-primary': '#e11d48',
        '--accent-secondary': '#f43f5e',
        '--accent-hover': '#be123c',
        '--accent-glow': 'rgba(225, 29, 72, 0.15)',
      }
    }
  },
  {
    key: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Sleek, refreshing arctic glacier blue and subzero hues',
    colors: {
      dark: {
        '--accent-primary': '#38bdf8',
        '--accent-secondary': '#bae6fd',
        '--accent-hover': '#0284c7',
        '--accent-glow': 'rgba(56, 189, 248, 0.15)',
      },
      light: {
        '--accent-primary': '#0284c7',
        '--accent-secondary': '#38bdf8',
        '--accent-hover': '#0369a1',
        '--accent-glow': 'rgba(2, 132, 199, 0.15)',
      }
    }
  },
  {
    key: 'royal-navy',
    name: 'Royal Navy',
    description: 'Regal ocean depths blue and high-clarity electric azure',
    colors: {
      dark: {
        '--accent-primary': '#3b82f6',
        '--accent-secondary': '#93c5fd',
        '--accent-hover': '#2563eb',
        '--accent-glow': 'rgba(59, 130, 246, 0.15)',
      },
      light: {
        '--accent-primary': '#2563eb',
        '--accent-secondary': '#3b82f6',
        '--accent-hover': '#1d4ed8',
        '--accent-glow': 'rgba(37, 99, 237, 0.15)',
      }
    }
  },
  {
    key: 'classic-cream',
    name: 'Classic Cream',
    description: 'Vellum paper, soft sepia hues, and dark chocolate ink',
    colors: {
      dark: {
        '--accent-primary': '#d97706',
        '--accent-secondary': '#f59e0b',
        '--accent-hover': '#b45309',
        '--accent-glow': 'rgba(217, 119, 6, 0.15)',
        '--bg-app': '#1c1917',
        '--bg-sidebar': '#171412',
        '--bg-card': '#292522',
        '--bg-editor': '#141210',
        '--text-primary': '#f5f5f4',
        '--text-secondary': '#d6d3d1',
        '--border-color': '#44403c',
      },
      light: {
        '--accent-primary': '#854d0e',
        '--accent-secondary': '#a16207',
        '--accent-hover': '#713f12',
        '--accent-glow': 'rgba(133, 77, 14, 0.15)',
        '--bg-app': '#fdfbf7',
        '--bg-sidebar': '#faf6ee',
        '--bg-card': '#f1ebd9',
        '--bg-editor': '#fffefc',
        '--text-primary': '#2d2522',
        '--text-secondary': '#5c4e49',
        '--border-color': '#e3d6bc',
      }
    }
  },
  {
    key: 'bento-zinc',
    name: 'Bento Zinc',
    description: 'Ultra-minimalist modern monochrome industrial slate gray',
    colors: {
      dark: {
        '--accent-primary': '#fafafa',
        '--accent-secondary': '#a1a1aa',
        '--accent-hover': '#f4f4f5',
        '--accent-glow': 'rgba(250, 250, 250, 0.12)',
      },
      light: {
        '--accent-primary': '#18181b',
        '--accent-secondary': '#71717a',
        '--accent-hover': '#27272a',
        '--accent-glow': 'rgba(24, 24, 27, 0.12)',
      }
    }
  }
];

export const applyThemePreset = (themeKey: string, lightTheme: boolean) => {
  const preset = THEME_PRESETS.find(p => p.key === themeKey) || THEME_PRESETS[0];
  const colors = lightTheme ? preset.colors.light : preset.colors.dark;

  // Clear any existing custom variable style attributes from :root first
  const root = document.documentElement;
  
  // Standard variable list to clean up
  const allVars = [
    '--accent-primary',
    '--accent-secondary',
    '--accent-hover',
    '--accent-glow',
    '--bg-app',
    '--bg-sidebar',
    '--bg-card',
    '--bg-editor',
    '--text-primary',
    '--text-secondary',
    '--border-color'
  ];
  
  allVars.forEach(v => root.style.removeProperty(v));

  // Set new variable values
  Object.entries(colors).forEach(([property, value]) => {
    if (value) {
      root.style.setProperty(property, value);
    }
  });
};

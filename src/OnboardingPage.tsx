import React, { useState } from 'react';
import { User, Sparkles, Palette, BookOpen, Film, PenTool, ArrowRight, Check, Compass } from 'lucide-react';
import { THEME_PRESETS, applyThemePreset } from './utils/themePresets';

interface OnboardingPageProps {
  onComplete: (profile: {
    name: string;
    writingRole: string;
    focusArea: string;
    selectedTheme: string;
  }) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [writingRole, setWritingRole] = useState('novelist');
  const [focusArea, setFocusArea] = useState('drafting');
  const [selectedTheme, setSelectedTheme] = useState('obsidian-royal');

  const handleThemeSelect = (themeKey: string) => {
    setSelectedTheme(themeKey);
    // Real-time preview of the chosen theme combination
    applyThemePreset(themeKey, false);
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const profile = {
      name: name.trim(),
      writingRole,
      focusArea,
      selectedTheme
    };

    localStorage.setItem('user_profile', JSON.stringify(profile));
    onComplete(profile);
  };

  return (
    <div 
      className="no-print"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at center, var(--bg-card) 0%, var(--bg-app) 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        overflowY: 'auto'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'rgba(24, 24, 27, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Onboarding Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent-secondary)',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px'
          }}>
            <Sparkles size={28} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Welcome to Ligama Studio
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.45 }}>
            Let's configure your personalized high-performance workspace to match your creative flow.
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0' }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{
                width: step === i ? '24px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: step >= i ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--accent-secondary)' }} />
                Tell us about yourself
              </h2>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What is your name?
                </label>
                <input 
                  type="text" 
                  className="input" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your pen name or author identity..."
                  required
                  autoFocus
                  style={{
                    fontSize: '15px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.2)',
                    width: '100%',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Your name will be used to personalize greetings, compile book metadata (as author name), and generate studio writing achievements.
              </p>
            </div>
          )}

          {/* STEP 2: CREATIVE ROLE */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Compass size={18} style={{ color: 'var(--accent-secondary)' }} />
                  Your Creative Direction
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  We will optimize search indexes, sidebars, and suggestions to align with your project format.
                </p>
              </div>

              {/* Roles Selection */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primary writing format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'screenwriter', label: 'Screenplay & Film Writer', icon: Film, desc: 'Cinema scripts, acts & screenplays' },
                    { id: 'novelist', label: 'Novel & Story Writer', icon: BookOpen, desc: 'Novels, short stories & fiction' },
                    { id: 'playwright', label: 'Playwright & Dramatist', icon: PenTool, desc: 'Theater plays & dialogue acts' },
                    { id: 'poet', label: 'Poet / Songwriter', icon: Sparkles, desc: 'Lyrics, poetry & verses' }
                  ].map(role => {
                    const Icon = role.icon;
                    const isActive = writingRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setWritingRole(role.id)}
                        style={{
                          background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.01)',
                          border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div style={{
                          background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{role.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{role.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Creative Focus */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What is your primary focus?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'outlining', label: 'Plotting & Storyboard', desc: 'Map acts, scenes & plot beats' },
                    { id: 'characters', label: 'Dialogue & Character Arc', desc: 'Chemistry, sheets & mentions' },
                    { id: 'drafting', label: 'Speed Drafting', desc: 'Maintain raw writing flow' },
                    { id: 'publishing', label: 'Industry Formatting', desc: 'Standard screenplay & page layouts' }
                  ].map(focus => {
                    const isActive = focusArea === focus.id;
                    return (
                      <button
                        key={focus.id}
                        type="button"
                        onClick={() => setFocusArea(focus.id)}
                        style={{
                          background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.01)',
                          border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: '12px',
                          padding: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{focus.label}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{focus.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: WORKSPACE THEMES */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Palette size={18} style={{ color: 'var(--accent-secondary)' }} />
                  Select Studio Color Scheme
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Choose from 10 premium writing environment configurations. Clicking a card dynamically previews the theme!
                </p>
              </div>

              {/* Theme Grid */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  paddingRight: '6px'
                }}
              >
                {THEME_PRESETS.map((preset) => {
                  const isActive = selectedTheme === preset.key;
                  const primaryColor = preset.colors.dark['--accent-primary'];
                  const secondaryColor = preset.colors.dark['--accent-secondary'];
                  
                  return (
                    <div
                      key={preset.key}
                      onClick={() => handleThemeSelect(preset.key)}
                      style={{
                        background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.01)',
                        border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</span>
                        {isActive && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                      </div>
                      
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{preset.description}</span>
                      
                      {/* Swatches */}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: primaryColor }} />
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: secondaryColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            {step > 1 ? (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleBack}
                style={{ padding: '10px 18px', borderRadius: '10px' }}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={step === 1 && !name.trim()}
                onClick={handleNext}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px'
                }}
              >
                Next Step
                <ArrowRight size={14} />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ 
                  padding: '10px 24px', 
                  borderRadius: '10px', 
                  fontWeight: 600,
                  boxShadow: '0 4px 14px var(--accent-glow)'
                }}
              >
                Enter Studio
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

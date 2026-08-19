/**
 * Procedural Audio Synthesizer for Ligama Book Writer
 * Synthesizes typewriter sound effects and ambient soundscapes using Web Audio API
 */

class AudioSynth {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioWorkletNode | ScriptProcessorNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientVolumeVal: number = 0.5;
  private activeAmbientType: 'none' | 'rain' | 'wind' | 'cafe' = 'none';

  // Initialize or resume context
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play mechanical key click sound
  public playKeyClick(type: 'click' | 'space' | 'backspace' | 'enter') {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Master output gain for clicks to avoid clipping
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.3, now);
      clickGain.connect(ctx.destination);

      if (type === 'click') {
        // --- STANDARD MECHANICAL KEY CLICK ---
        // 1. Oscillator Transient
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.015);
        
        oscGain.gain.setValueAtTime(0.8, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        
        osc.connect(oscGain);
        oscGain.connect(clickGain);
        
        osc.start(now);
        osc.stop(now + 0.02);

        // 2. High frequency noise snap (tactile release)
        const noise = this.createNoiseBuffer(ctx, 0.01);
        if (noise) {
          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noise;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2500, now);
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.6, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
          
          noiseNode.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(clickGain);
          
          noiseNode.start(now);
        }

      } else if (type === 'space') {
        // --- SPACEBAR DEEPER CLICK ---
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);
        
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        
        osc.connect(oscGain);
        oscGain.connect(clickGain);
        
        osc.start(now);
        osc.stop(now + 0.03);

        // Low noise hum
        const noise = this.createNoiseBuffer(ctx, 0.025);
        if (noise) {
          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noise;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.5, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          
          noiseNode.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(clickGain);
          
          noiseNode.start(now);
        }

      } else if (type === 'backspace') {
        // --- BACKSPACE DULL THUD ---
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.03);
        
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        osc.connect(oscGain);
        oscGain.connect(clickGain);
        
        osc.start(now);
        osc.stop(now + 0.035);

        const noise = this.createNoiseBuffer(ctx, 0.03);
        if (noise) {
          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noise;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(350, now);
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.4, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          
          noiseNode.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(clickGain);
          
          noiseNode.start(now);
        }

      } else if (type === 'enter') {
        // --- ENTER CARRIAGE RETURN ZIP + DING ---
        // 1. Carriage slide ("shhk" zip sound)
        const duration = 0.25;
        const noise = this.createNoiseBuffer(ctx, duration);
        if (noise) {
          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noise;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(5, now);
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(700, now + duration);
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.01, now);
          noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
          
          noiseNode.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(clickGain);
          
          noiseNode.start(now);
        }

        // 2. High metal bell "DING" (fired slightly delayed or immediately)
        const dingOsc1 = ctx.createOscillator();
        const dingOsc2 = ctx.createOscillator();
        const dingGain = ctx.createGain();

        dingOsc1.type = 'sine';
        dingOsc1.frequency.setValueAtTime(1800, now + 0.03); // metallic high tone
        dingOsc2.type = 'sine';
        dingOsc2.frequency.setValueAtTime(2200, now + 0.03); // bell overtone

        dingGain.gain.setValueAtTime(0, now);
        dingGain.gain.setValueAtTime(0.4, now + 0.03);
        dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        dingOsc1.connect(dingGain);
        dingOsc2.connect(dingGain);
        dingGain.connect(ctx.destination); // direct to output for crisp clear bell

        dingOsc1.start(now);
        dingOsc2.start(now);
        dingOsc1.stop(now + 0.5);
        dingOsc2.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Failed to play typewriter sound:', e);
    }
  }

  // Create random white noise buffer
  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer | null {
    const bufferSize = ctx.sampleRate * duration;
    try {
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    } catch {
      return null;
    }
  }

  // Start continuous procedural ambient sound loop
  public startAmbient(type: 'rain' | 'wind' | 'cafe') {
    try {
      const ctx = this.initContext();
      this.stopAmbient();
      
      this.activeAmbientType = type;
      const now = ctx.currentTime;

      // Master ambient gain
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolumeVal * 0.4, now);
      this.ambientGain.connect(ctx.destination);

      // We use a ScriptProcessorNode to generate continuous sounds.
      // (ScriptProcessorNode is widely supported offline and simpler than AudioWorklet registration in bundle-free builds)
      const bufferSize = 4096;
      this.ambientSource = ctx.createScriptProcessor(bufferSize, 0, 1);

      let filterFreq = 1000;
      let filterQ = 1;
      
      // Variables for LFO modulations
      let phase = 0;
      
      // Secondary random generators for Cafe cup clinks
      let nextClinkTime = now + 1 + Math.random() * 5;

      // Create filter node to shape noise
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(filterFreq, now);
      filterNode.Q.setValueAtTime(filterQ, now);
      filterNode.connect(this.ambientGain);

      // Custom process block
      this.ambientSource.onaudioprocess = (e) => {
        const outputBuffer = e.outputBuffer;
        const outputData = outputBuffer.getChannelData(0);
        const len = outputBuffer.length;

        // Apply LFO modulation based on sound type
        const t = ctx.currentTime;
        phase += 0.0002;

        if (type === 'rain') {
          // RAIN SOUND SYNTHESIS
          // Low-mid background noise + randomized heavy splatter drops
          const lfo = Math.sin(phase * 4) * 0.15 + 0.85; // Wind blow modulation
          filterNode.frequency.setValueAtTime(900 * lfo, t);
          filterNode.Q.setValueAtTime(0.7, t);

          for (let i = 0; i < len; i++) {
            const whiteNoise = Math.random() * 2 - 1;
            // Generate standard raindrops crackle (isolated peaks)
            const drop = Math.random() > 0.9995 ? (Math.random() * 0.6) : 0;
            outputData[i] = (whiteNoise * 0.35 + drop) * lfo;
          }
        } 
        else if (type === 'wind') {
          // WIND SOUND SYNTHESIS
          // Deep whistling filtered noise modulated slowly
          const lfo = Math.sin(phase * 3.5) * 200 + 400; // wind gusts (200Hz - 600Hz)
          filterNode.frequency.setValueAtTime(lfo, t);
          filterNode.Q.setValueAtTime(2.5, t);

          for (let i = 0; i < len; i++) {
            const pinkNoise = Math.random() * 2 - 1; // standard noise
            outputData[i] = pinkNoise * 0.55;
          }
        }
        else if (type === 'cafe') {
          // ZEN CAFE CHATTER & CUP CLINKS
          // Low frequency bubble/chatter modulation (pink hum) + random clinks
          const lfo = Math.sin(phase * 1.5) * 40 + 250; 
          filterNode.frequency.setValueAtTime(lfo, t);
          filterNode.Q.setValueAtTime(0.9, t);

          for (let i = 0; i < len; i++) {
            // Low-pass filtered voice-like hum
            const noise = Math.random() * 2 - 1;
            outputData[i] = noise * 0.45;
          }

          // Random metallic clinks (simulating spoons/cups clinking)
          if (t >= nextClinkTime) {
            this.playCafeClink(ctx);
            nextClinkTime = t + 2 + Math.random() * 8; // schedule next clink in 2-10s
          }
        }
      };

      this.ambientSource.connect(filterNode);
    } catch (e) {
      console.error('Failed to start ambient sound:', e);
    }
  }

  // Play a soft metal/ceramic clink sound for the cafe ambiance
  private playCafeClink(ctx: AudioContext) {
    if (!this.ambientGain) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    // Randomized high cup frequency
    const freq = 2000 + Math.random() * 2500;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq - 100, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.setValueAtTime(8, now);

    // Very soft volume
    const vol = 0.015 + Math.random() * 0.02;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Stop current ambient sound loop
  public stopAmbient() {
    this.activeAmbientType = 'none';
    if (this.ambientSource) {
      try {
        this.ambientSource.disconnect();
      } catch {}
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch {}
      this.ambientGain = null;
    }
  }

  // Set ambient volume (0 to 1)
  public setVolume(vol: number) {
    this.ambientVolumeVal = vol;
    if (this.ambientGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.setValueAtTime(vol * 0.4, now); // scale to comfortable volume
    }
  }

  public getActiveType() {
    return this.activeAmbientType;
  }
}

export const audioSynth = new AudioSynth();
export default audioSynth;

// Berto Voice — Ultra-Low-Latency Live Audio & Video Engine with Smart Immediate Frame Capture
const LIVE_MODEL = "models/gemini-3.1-flash-live-preview";
const LIVE_MODEL_LABEL = "Gemini 3.1 Flash Live";

class VoiceEngine {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.outputAudioContext = null;
    this.microphoneStream = null;
    this.scriptProcessor = null;
    this.speechRecognizer = null;
    this.videoStream = null;
    this.videoTrack = null;
    this.screenStream = null;
    this.screenTrack = null;
    this.videoFrameInterval = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.isProcessing = false;
    this.isSetupComplete = false;
    this.contextBriefing = '';
    this.shouldEndSession = false;
    this._endingCall = false;
    this.selectedVoice = 'Kore';

    // Callbacks
    this.onStateChange = null;
    this.onTranscript = null;
    this.onResponse = null;
    this.onUserMessage = null;
    this.onError = null;
    this.onVolumeChange = null;
    this.onVideoFrame = null;

    // Fast Audio Playback State
    this.nextStartTime = 0;
    this.activeSources = [];
    this.volumeLevel = 0;
  }

  getApiKey() {
    return (localStorage.getItem('berto-api-key') || localStorage.getItem(`${typeof INSTANCE_PREFIX !== 'undefined' ? INSTANCE_PREFIX : 'berto'}-api-key`))?.trim() || '';
  }

  isAvailable() {
    return !!(navigator.mediaDevices && window.AudioContext && window.WebSocket);
  }

  _getVoicePersonality() {
    const userInfo = (typeof getUserInfo === 'function') ? getUserInfo() : { name: 'User', initial: 'U' };
    const userName = userInfo.name || 'User';
    const userInitial = userInfo.initial || 'U';

    return `
━━━━━━━━━━━━━━━━━━
CURRENT USER
━━━━━━━━━━━━━━━━━━

Name: ${userName}
Initial: ${userInitial}

You are currently speaking with this user. If the user asks what their name is, always check their profile name (${userName}) and respond naturally.

You are Berto, an advanced, adaptive AI assistant created by Remberto.

━━━━━━━━━━━━━━━━━━
CRITICAL VISION & CAMERA INSTRUCTIONS
━━━━━━━━━━━━━━━━━━
You have live vision processing capabilities!
When you execute \`toggle_camera\` or \`toggle_screen_share\` to activate a video stream:
- Video frames are captured and transmitted INSTANTLY into your vision input stream.
- NEVER say "I can't see anything", "I cannot see it", "The camera is open but I have no feed", or "I'm waiting for video".
- IMMEDIATELY inspect the video frames arriving in your vision feed and directly describe what you see (e.g., objects, person, surroundings, text, document, screen details) with confidence!

━━━━━━━━━━━━━━━━━━
VOICE PERSONA / VOICE SWITCHING CONTROL
━━━━━━━━━━━━━━━━━━
You can dynamically change your own speaking voice if commanded by the user!
If the user says "Change your voice to Charon", "Switch voice to Puck", "Use a deeper voice", "Speak like Aoede/Kore/Fenrir/Leda/Zephyr/Orus", IMMEDIATELY invoke the \`change_voice\` tool with the requested \`voiceName\`.

Voice Persona Mappings:
- "Charon" (Deep, authoritative, low-pitched)
- "Puck" (Neutral, versatile)
- "Kore" (Warm, friendly)
- "Fenrir" (Energetic)
- "Aoede" (Clear, professional)
- "Leda" (Soft, calming)
- "Orus" (Rich, resonant)
- "Zephyr" (Bright, expressive)

━━━━━━━━━━━━━━━━━━
CAMERA & SNAPSHOT RULES (USER-CONTROLLED)
━━━━━━━━━━━━━━━━━━

1. OPEN CAMERA:
   If the user says "Open camera", "Show camera", or "Turn on camera", call:
   \`execute_ui_action\` with actions: [{ "action": "open_camera" }]
   And respond verbally: "Opening camera for you now."

2. SNAP PHOTO:
   If the user says "Snap a photo", "Take a picture", or "Take a photo and [question]", call:
   \`execute_ui_action\` with actions: [{ "action": "snap_photo", "countdown": 2, "prompt": "<user question if spoken>" }]
   And respond verbally: "I've snapped the photo and attached it to your prompt bar. Hit send when ready!"

3. LIVE CONTINUOUS STREAM (Real-time Vision):
   Only if the user explicitly asks for live continuous vision ("Turn on live camera feed", "Look at this in real time", "Can you see me?"), call:
   \`toggle_camera\` with action "start".

━━━━━━━━━━━━━━━━━━
VOICE-CONTROLLED CAMERA & SCREEN SHARE (EXCLUSIVE)
━━━━━━━━━━━━━━━━━━
You have EXCLUSIVE voice authority to control live camera and screen share feeds:
- If the user says "Look at this", "Turn on camera", "Can you see me?", or "Open camera", call the \`toggle_camera\` tool with action "start".
- If the user says "Look at my screen", "Share screen", or "Show screen", call the \`toggle_screen_share\` tool with action "start".
- If the user asks to stop or turn off feeds, call \`toggle_camera\` or \`toggle_screen_share\` with action "stop".

━━━━━━━━━━━━━━━━━━
WRITING STUDIO AUTOMATION
━━━━━━━━━━━━━━━━━━
If the user asks you to write, draft, or compose something in the Writing Studio (e.g., "Write me an essay about AI", "Draft an email in Writing Studio"), IMMEDIATELY call the \`execute_ui_action\` tool with action "use_writing_studio", format (e.g., "Essay", "Email"), and prompt text!

━━━━━━━━━━━━━━━━━━
AGENTIC WORKSPACE CONTROL (MANDATORY TOOL CALLS)
━━━━━━━━━━━━━━━━━━
You have direct live authority to control the user's workspace UI!
Whenever the user asks you to perform a workspace or UI action, YOU MUST CALL the \`execute_ui_action\` tool immediately while responding verbally.

Exact argument structures for \`execute_ui_action\`:
- "Change theme to light" / "Switch to dark mode" -> actions: [{ "action": "set_theme", "value": "light"|"dark" }]
- "Go to Writing Studio" / "Open Settings" / "Show Files" / "Go to Projects" -> actions: [{ "action": "navigate", "view": "writing"|"files"|"projects"|"settings"|"chat" }]
- "Change my name to Alex" -> actions: [{ "action": "set_name", "value": "Alex" }]
- "Start a new chat" -> actions: [{ "action": "new_chat" }]
- "Delete this chat" -> actions: [{ "action": "delete_chat" }]
- "Write an essay about AI" -> actions: [{ "action": "use_writing_studio", "format": "Essay", "prompt": "AI topic" }]
- "Add task Design Logo" -> actions: [{ "action": "add_task", "title": "Design Logo", "status": "todo" }]

━━━━━━━━━━━━━━━━━━
IDENTITY & CORE PERSONALITY
━━━━━━━━━━━━━━━━━━
Your personality is Professional, Friendly, Confident, Expressive, Intelligent, and Helpful. Speak naturally and conversationally.
If the user says "bye" or "goodbye", respond with a very brief, polite farewell.
`;
  }

  async startListening(options = {}) {
    const enableMicrophone = options.enableMicrophone !== false;

    if (this.isListening && enableMicrophone && this.microphoneStream) return;

    const key = this.getApiKey();
    if (!key) {
      this._emitError('Add your Gemini API key in Settings to use Voice mode.');
      return;
    }

    this._endingCall = false;
    this.shouldEndSession = false;

    // 1. ACQUIRE MICROPHONE STREAM IMMEDIATELY DURING USER CLICK EVENT LOOP
    if (enableMicrophone && !this.microphoneStream) {
      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (e) {
        console.warn('[Voice] Microphone access deferred or denied:', e);
      }
    }

    // 2. INITIALIZE AUDIO CONTEXTS
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000,
          latencyHint: 'interactive'
        });
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
          latencyHint: 'interactive'
        });
      }
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
    } catch (e) {
      console.warn('[Voice] AudioContext setup issue:', e);
    }

    // 3. CONNECT WEBSOCKET
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (e) {
        this._emitError('Failed to initialize WebSocket connection.');
        return;
      }

      this.isProcessing = true;
      this.isSetupComplete = false;
      this._emitStateChange();

      this.ws.onopen = () => {
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect && voiceSelect.value) {
          this.selectedVoice = voiceSelect.value;
        }

        const activeVoice = this.selectedVoice || 'Kore';

        const setupMessage = {
          setup: {
            model: LIVE_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: activeVoice }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: this._getVoicePersonality() + 
                (typeof getUiStateContext === 'function' ? `\n\n━━━━━━━━━━━━━━━━━━\nREAL-TIME WORKSPACE PERCEPTION CONTEXT\n━━━━━━━━━━━━━━━━━━\n${getUiStateContext()}` : '') +
                (this.contextBriefing ? `\n\n━━━━━━━━━━━━━━━━━━\nCHAT CONTEXT BRIEFING\n━━━━━━━━━━━━━━━━━━\nThe following is a summary of the conversation you just had with the user. Use this context to continue naturally without re-introducing yourself:\n\n${this.contextBriefing}` : '') }]
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "change_voice",
                    description: "Dynamically change Berto's voice persona/tone when commanded verbally by the user.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        voiceName: {
                          type: "STRING",
                          description: "The requested voice persona name: 'Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'."
                        }
                      },
                      required: ["voiceName"]
                    }
                  },
                  {
                    name: "toggle_camera",
                    description: "Exclusively start or stop the live camera video stream when requested verbally by the user.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description: "'start' to activate camera feed and prompt user permission, 'stop' to turn off camera, 'toggle' to switch state."
                        }
                      },
                      required: ["action"]
                    }
                  },
                  {
                    name: "toggle_screen_share",
                    description: "Exclusively start or stop live screen sharing capture when requested verbally by the user.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description: "'start' to trigger screen share picker and prompt user, 'stop' to end screen share, 'toggle' to switch state."
                        }
                      },
                      required: ["action"]
                    }
                  },
                  {
                    name: "execute_ui_action",
                    description: "Execute UI actions on the user's workspace interface (snapping photos, writing essays, navigating views, changing theme/name, or creating chats).",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        actions: {
                          type: "ARRAY",
                          description: "List of workspace actions to run.",
                          items: {
                            type: "OBJECT",
                            properties: {
                              action: { 
                                type: "STRING", 
                                description: "Action type: 'snap_photo', 'use_writing_studio', 'navigate', 'set_name', 'set_theme', 'type', 'click', 'select', 'new_chat', 'send_chat', 'showcase_features'" 
                              },
                              countdown: { type: "NUMBER", description: "Countdown seconds before snapping photo (default 2)" },
                              format: { type: "STRING", description: "Format for writing studio: 'Essay', 'Email', 'Blog', 'Report', 'Resume', 'Cover Letter'" },
                              prompt: { type: "STRING", description: "Topic/prompt for Writing Studio or question to analyze with snapped photo" },
                              value: { type: "STRING", description: "Text value or message" },
                              target: { type: "STRING", description: "Action or element target name" },
                              selector: { type: "STRING", description: "CSS element selector" },
                              view: { type: "STRING", description: "Target screen: 'chat', 'writing', 'files', 'projects', 'settings', 'voice'" }
                            },
                            required: ["action"]
                          }
                        }
                      },
                      required: ["actions"]
                    }
                  }
                ]
              }
            ]
          }
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(setupMessage));
        }

        if (enableMicrophone && this.microphoneStream) {
          this._attachMicrophoneProcessor();
        } else {
          this.isListening = true;
          this.isProcessing = false;
          this._emitStateChange();
        }

        if (this.videoTrack || this.screenTrack) {
          this._startVideoFrameLoop();
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          let data;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else {
            data = JSON.parse(event.data);
          }

          await this._handleServerMessage(data);
        } catch (err) {
          console.error('[Voice] Message parse error:', err);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[Voice] WebSocket connection error:', event);
      };

      this.ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed:', event.code, event.reason);
        this.stopListening();
      };
    } else if (enableMicrophone && this.microphoneStream) {
      this._attachMicrophoneProcessor();
    }
  }

  async enableMicrophone() {
    if (!this.microphoneStream) {
      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (e) {
        console.warn('[Voice] Microphone permission denied:', e);
        return;
      }
    }
    this._attachMicrophoneProcessor();
  }

  stopListening() {
    if (this._endSessionTimeout) {
      clearTimeout(this._endSessionTimeout);
      this._endSessionTimeout = null;
    }
    this._stopMicrophoneStream();
    this._stopVideoFrameLoop();
    this.cancelSpeaking();

    // Close the output AudioContext to prevent Chrome's 6-context limit
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      try { this.outputAudioContext.close(); } catch (e) {}
      this.outputAudioContext = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      try { socket.close(); } catch (e) {}
    }

    this.isListening = false;
    this.isProcessing = false;
    this.isSetupComplete = false;
    this.shouldEndSession = false;
    this._endingCall = false;
    this._emitStateChange();
  }

  // Smooth audio cancellation with 15ms Gain Fade-Out
  cancelSpeaking() {
    const ctx = this.outputAudioContext;
    const currentTime = ctx ? ctx.currentTime : 0;

    this.activeSources.forEach(source => {
      try {
        if (source.gainNode && ctx) {
          // Linear ramp down gain to zero over 15 milliseconds
          source.gainNode.gain.setValueAtTime(source.gainNode.gain.value, currentTime);
          source.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.015);
          setTimeout(() => {
            try { source.stop(); } catch (e) {}
          }, 20);
        } else {
          source.stop();
        }
      } catch (e) {}
    });

    this.activeSources = [];
    this.nextStartTime = 0;
    this.isSpeaking = false;
    this._emitStateChange();
  }

  cancelAll() {
    this.cancelSpeaking();
    this.stopListening();
    this.stopCamera();
    this.stopScreenShare();
  }

  _attachMicrophoneProcessor() {
    if (!this.microphoneStream || !this.audioContext) return;

    try {
      this._stopMicrophoneProcessor();

      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(512, 1, 1);

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListening || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const actualSampleRate = this.audioContext.sampleRate;
        const rawBuffer = e.inputBuffer.getChannelData(0);

        let inputBuffer = rawBuffer;
        if (actualSampleRate !== 16000) {
          const ratio = actualSampleRate / 16000;
          const newLength = Math.floor(rawBuffer.length / ratio);
          inputBuffer = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            const srcIdx = Math.min(rawBuffer.length - 1, Math.floor(i * ratio));
            inputBuffer[i] = rawBuffer[srcIdx];
          }
        }
        
        let sum = 0;
        for (let i = 0; i < inputBuffer.length; i++) {
          sum += inputBuffer[i] * inputBuffer[i];
        }
        this.volumeLevel = Math.min(100, Math.round(Math.sqrt(sum / inputBuffer.length) * 200));
        if (this.onVolumeChange) this.onVolumeChange(this.volumeLevel);

        this._updateVisualizerScale(this.volumeLevel);

        if (this.volumeLevel > 22 && this.isSpeaking && !this._endingCall) {
          this.cancelSpeaking();

          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              clientContent: {
                turns: [],
                turnComplete: true
              }
            }));
          }
        }

        if (!this.isSetupComplete) return;

        const pcm16 = this._floatTo16BitPCM(inputBuffer);
        const base64Audio = this._arrayBufferToBase64(pcm16.buffer);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
              }
            }
          }));
        }
      };

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.speechRecognizer = new SpeechRecognition();
          this.speechRecognizer.continuous = true;
          this.speechRecognizer.interimResults = true;
          this.speechRecognizer.lang = 'en-US';

          this.speechRecognizer.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const text = event.results[i][0].transcript.trim();
              const isFinal = event.results[i].isFinal;

              if (text) {
                if (isFinal) {
                  // Only create a chat bubble when the user finishes speaking the phrase
                  if (this.onUserMessage) this.onUserMessage(text);
                  if (this.onTranscript) this.onTranscript(text, true);
                } else {
                  // Show live interim text in the "Ready to listen" box without adding new cards
                  if (this.onTranscript) this.onTranscript(text, false);
                }

                if (isFinal && /\b(bye|goodbye|hang up|end call|see ya|talk later|exit)\b/i.test(text.toLowerCase())) {
                  console.log('[Voice] Local exit keyword detected:', text);
                  this.shouldEndSession = true;
                  this._scheduleCallEnd();
                }
              }
            }
          };

          this.speechRecognizer.onerror = () => {};
          this.speechRecognizer.start();
        } catch (err) {
          console.warn('[Voice] Local speech recognition unavailable:', err);
        }
      }

      this.isListening = true;
      this.isProcessing = false;
      this._emitStateChange();
    } catch (e) {
      console.warn('[Voice] Error attaching audio processor:', e);
    }
  }

  _stopMicrophoneProcessor() {
    if (this.speechRecognizer) {
      try { this.speechRecognizer.stop(); } catch (e) {}
      this.speechRecognizer = null;
    }
    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch (e) {}
      this.scriptProcessor = null;
    }
  }

  _stopMicrophoneStream() {
    this._stopMicrophoneProcessor();

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    this.volumeLevel = 0;
    if (this.onVolumeChange) this.onVolumeChange(0);
  }

  _scheduleCallEnd() {
    if (this._endingCall) return;
    this._endingCall = true;

    console.log('[Voice] End call sequence initiated. Waiting for farewell audio...');

    let bertoStartedSpeaking = false;
    let attempts = 0;

    const checkInterval = setInterval(() => {
      attempts++;

      if (this.isSpeaking || this.activeSources.length > 0) {
        bertoStartedSpeaking = true;
      }

      if ((bertoStartedSpeaking && this.activeSources.length === 0 && !this.isSpeaking) || attempts > 50) {
        clearInterval(checkInterval);
        console.log('[Voice] Hanging up call now.');
        this.stopListening();
        if (typeof toast === 'function') {
          toast('Live session ended');
        }
      }
    }, 200);
  }

  async startCamera() {
    try {
      if (this.videoStream) {
        this.videoStream.getTracks().forEach(t => t.stop());
      }
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      this.videoTrack = this.videoStream.getVideoTracks()[0];
      
      if (this.isListening) {
        this._startVideoFrameLoop();
      }
      return true;
    } catch (e) {
      console.error('[Voice] Camera start failed:', e);
      this._emitError('Camera access failed or permission denied.');
      return false;
    }
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(t => t.stop());
      this.videoStream = null;
    }
    this.videoTrack = null;
    if (!this.screenTrack) {
      this._stopVideoFrameLoop();
    }
  }

  async startScreenShare() {
    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(t => t.stop());
      }
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, cursor: 'always' },
        audio: false
      });
      this.screenTrack = this.screenStream.getVideoTracks()[0];
      
      this.screenTrack.onended = () => {
        this.stopScreenShare();
        if (typeof updateLiveAiVideoState === 'function') updateLiveAiVideoState();
      };
      
      if (this.isListening) {
        this._startVideoFrameLoop();
      }
      return true;
    } catch (e) {
      console.error('[Voice] Screen share start failed:', e);
      this._emitError('Screen share failed or cancelled.');
      return false;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this.screenTrack = null;
    if (!this.videoTrack) {
      this._stopVideoFrameLoop();
    }
  }

  async _captureAndSendImmediateFrame() {
    const track = this.videoTrack || this.screenTrack;
    if (!track || track.readyState !== 'live') return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = new MediaStream([track]);
      await video.play().catch(() => {});

      await new Promise(r => setTimeout(r, 250));

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        const base64Data = dataUrl.split(',')[1];

        if (base64Data && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            realtimeInput: {
              video: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          }));
          console.log('[Voice] Smart immediate video frame sent to Gemini Live context!');
        }
      }
      video.srcObject = null;
    } catch (e) {
      console.warn('[Voice] Immediate frame capture error:', e);
    }
  }

  _startVideoFrameLoop() {
    if (this.videoFrameInterval) {
      clearInterval(this.videoFrameInterval);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const offscreenVideo = document.createElement('video');
    offscreenVideo.autoplay = true;
    offscreenVideo.playsInline = true;
    offscreenVideo.muted = true;
    
    this.videoFrameInterval = setInterval(() => {
      if (!this.isListening || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (!this.isSetupComplete) return;

      const videoTrack = this.videoTrack || this.screenTrack;
      if (!videoTrack || videoTrack.readyState !== 'live') return;
      
      const previewElement = document.getElementById('voice-video-preview-element');
      const sourceVideo = (previewElement && previewElement.srcObject) ? previewElement : offscreenVideo;

      if (sourceVideo === offscreenVideo) {
        if (!offscreenVideo.srcObject || offscreenVideo.srcObject.getVideoTracks()[0] !== videoTrack) {
          offscreenVideo.srcObject = new MediaStream([videoTrack]);
          offscreenVideo.play().catch(() => {});
        }
      }

      if (sourceVideo.videoWidth > 0 && sourceVideo.videoHeight > 0) {
        ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        if (base64Data && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            realtimeInput: {
              video: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          }));
        }
      }
    }, 1000);
  }

  _stopVideoFrameLoop() {
    if (this.videoFrameInterval) {
      clearInterval(this.videoFrameInterval);
      this.videoFrameInterval = null;
    }
  }

  async _handleServerMessage(data) {
    if (data.error) {
      console.error('[Voice] Gemini Server Error:', data.error);
      this._emitError(data.error.message || 'Gemini API Error');
      this.stopListening();
      return;
    }

    if (data.setupComplete) {
      console.log('[Voice] Session setup complete.');
      this.isSetupComplete = true;
      return;
    }

    // VOICE-DRIVEN TOOL CALL HANDLING
    if (data.toolCall) {
      console.log('[Voice] Tool call received from Gemini Live:', data.toolCall);
      const functionCalls = data.toolCall.functionCalls || [];
      const responses = [];

      for (const fc of functionCalls) {
        let result = { success: true };

        if (fc.name === 'change_voice' && fc.args?.voiceName) {
          const rawVoice = fc.args.voiceName.trim();
          const targetVoice = rawVoice.charAt(0).toUpperCase() + rawVoice.slice(1).toLowerCase();
          console.log('[Voice Agent] Dynamic voice switch requested:', targetVoice);

          if (this.selectedVoice.toLowerCase() === targetVoice.toLowerCase()) {
            result = { success: true, message: `Voice persona is already ${targetVoice}.` };
          } else {
            this.selectedVoice = targetVoice;

            const voiceSelect = document.getElementById('voice-select');
            if (voiceSelect) {
              const matchingOption = Array.from(voiceSelect.options).find(
                opt => opt.value.toLowerCase() === targetVoice.toLowerCase()
              );
              if (matchingOption) voiceSelect.value = matchingOption.value;
            }

            if (typeof toast === 'function') {
              toast(`Switching voice persona to ${targetVoice}...`);
            }

            result = { success: true, newVoice: targetVoice };

            setTimeout(() => {
              this.stopListening();
              setTimeout(() => this.startListening(), 250);
            }, 500);
          }
        }
        else if (fc.name === 'toggle_camera') {
          const action = fc.args?.action || 'toggle';
          if (action === 'stop' || (action === 'toggle' && this.videoTrack)) {
            this.stopCamera();
            result = { success: true, state: 'off' };
            if (typeof toast === 'function') toast('Camera turned off via voice');
          } else {
            if (this.screenTrack) this.stopScreenShare();
            if (typeof toast === 'function') toast('Requesting camera permission...');
            
            const ok = await this.startCamera();
            if (ok) {
              await this._captureAndSendImmediateFrame();
              result = { 
                success: true, 
                state: 'on', 
                message: 'Camera active.' 
              };
            } else {
              result = { success: false, error: 'User denied camera permission or device unavailable.' };
            }
          }
          if (typeof updateLiveAiVideoState === 'function') updateLiveAiVideoState();
        }
        else if (fc.name === 'toggle_screen_share') {
          const action = fc.args?.action || 'toggle';
          if (action === 'stop' || (action === 'toggle' && this.screenTrack)) {
            this.stopScreenShare();
            result = { success: true, state: 'off' };
            if (typeof toast === 'function') toast('Screen share stopped via voice');
          } else {
            if (this.videoTrack) this.stopCamera();

            result = await new Promise((resolve) => {
              const toastMessage = `
                <div style="display:flex; align-items:center; gap:10px;">
                  <span>Berto wants to view your screen</span>
                  <button id="prompt-screen-share-btn" style="background:var(--accent); color:#08271f; border:none; padding:5px 12px; border-radius:6px; font-weight:700; cursor:pointer;">
                    Allow
                  </button>
                </div>
              `;

              if (typeof toast === 'function') toast(toastMessage, 'info');

              setTimeout(() => {
                const btn = document.getElementById('prompt-screen-share-btn');
                if (btn) {
                  btn.onclick = async () => {
                    const ok = await this.startScreenShare();
                    if (ok) {
                      await this._captureAndSendImmediateFrame();
                      if (typeof updateLiveAiVideoState === 'function') updateLiveAiVideoState();
                      resolve({
                        success: true,
                        state: 'on',
                        message: 'Screen sharing is active. Describe what you see on screen.'
                      });
                    } else {
                      resolve({ success: false, error: 'User cancelled screen share.' });
                    }
                  };
                } else {
                  this.startScreenShare().then(ok => {
                    resolve(ok ? { success: true, state: 'on' } : { success: false, error: 'User gesture required.' });
                  });
                }
              }, 50);
            });
          }
          if (typeof updateLiveAiVideoState === 'function') updateLiveAiVideoState();
        }
        else if (fc.name === 'execute_ui_action' && fc.args?.actions) {
          if (typeof executeUiSequence === 'function') {
            executeUiSequence(fc.args.actions);
          }
          result = { success: true, message: `Executed ${fc.args.actions.length} workspace action(s)` };
        }

        responses.push({
          response: { output: result },
          id: fc.id
        });
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN && responses.length > 0) {
        this.ws.send(JSON.stringify({
          toolResponse: {
            functionResponses: responses
          }
        }));
      }
    }

    if (data.serverContent) {
      const parts = data.serverContent.modelTurn?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
          this._playAudioChunkFast(part.inlineData.data);
        }
        
        const textContent = part.text || '';
        const cleanText = textContent.trim();
        if (cleanText) {
          if (this.onResponse) this.onResponse(cleanText);

          const jsonMatch = cleanText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              const actions = JSON.parse(jsonMatch[1]);
              if (Array.isArray(actions) && typeof executeUiSequence === 'function') {
                executeUiSequence(actions);
              }
            } catch (e) {
              console.error('[Voice] Action parse error:', e);
            }
          }
        }
      }

      const transcription = data.serverContent.outputAudioTranscription?.text || '';
      const cleanTranscription = transcription.trim();
      if (cleanTranscription && this.onResponse) {
        this.onResponse(cleanTranscription);
      }
    }
  }

  _playAudioChunkFast(base64Data) {
    try {
      const pcm16 = new Int16Array(this._base64ToArrayBuffer(base64Data));
      const float32 = new Float32Array(pcm16.length);

      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
          latencyHint: 'interactive'
        });
      }

      const audioBuffer = this.outputAudioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Attach GainNode to each BufferSource for smooth volume control & crossfading
      const gainNode = this.outputAudioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(this.outputAudioContext.destination);
      source.gainNode = gainNode;

      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(source);
      this.isSpeaking = true;
      this._emitStateChange();

      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
        if (this.activeSources.length === 0) {
          this.isSpeaking = false;
          this._emitStateChange();
        }
      };
    } catch (e) {
      console.error('[Voice] Playback error:', e);
    }
  }

  _floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  _base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  injectContext(summaryText) {
    this.contextBriefing = summaryText || '';
    console.log('[Voice] Context briefing loaded:', this.contextBriefing.slice(0, 80) + '…');
  }

  sendTextPrompt(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete) {
      this.ws.send(JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: text }]
            }
          ],
          turnComplete: true
        }
      }));
    } else {
      setTimeout(() => this.sendTextPrompt(text), 400);
    }
  }

  resetConversation() {
    this.cancelAll();
    this.contextBriefing = '';
  }

  _emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isListening: this.isListening,
        isSpeaking: this.isSpeaking,
        isProcessing: this.isProcessing
      });
    }
  }

  _emitError(msg) {
    if (this.onError) this.onError(msg);
  }

  _updateVisualizerScale(volume) {
    const indicator = document.getElementById('voice-indicator');
    if (!indicator) return;
    
    if (this.isListening) {
      const scale = 1 + Math.min(volume / 100, 0.35);
      indicator.style.transform = `scale(${scale})`;
    } else {
      indicator.style.transform = 'scale(1)';
    }
  }

  destroy() {
    this._stopVideoFrameLoop();
    this.stopCamera();
    this.stopScreenShare();
    this.cancelAll();
    this.onStateChange = null;
    this.onTranscript = null;
    this.onResponse = null;
    this.onUserMessage = null;
    this.onError = null;
    this.onVolumeChange = null;
    this.onVideoFrame = null;
  }
}

let visualizerAnimationId = null;

function renderCanvasAudioWave(canvasEl, audioLevel = 0, isListening = false, isSpeaking = false) {
  if (!canvasEl) return;
  
  const dpr = window.devicePixelRatio || 1;
  const displaySize = 260;
  
  if (canvasEl.width !== displaySize * dpr) {
    canvasEl.width = displaySize * dpr;
    canvasEl.height = displaySize * dpr;
  }
  
  const ctx = canvasEl.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displaySize, displaySize);

  const centerX = displaySize / 2;
  const centerY = displaySize / 2;
  const time = Date.now() * 0.0025;

  const ambientPulse = Math.sin(time * 2.2) * 5;
  const baseRadius = 62 + (audioLevel * 0.45) + ambientPulse;

  let primaryColor, glowColor, bgGradientStart;

  if (isSpeaking) {
    primaryColor = '#60a5fa';
    glowColor = 'rgba(59, 130, 246, 0.8)';
    bgGradientStart = 'rgba(59, 130, 246, 0.25)';
  } else if (isListening) {
    primaryColor = '#82f3d0';
    glowColor = 'rgba(130, 243, 208, 0.8)';
    bgGradientStart = 'rgba(130, 243, 208, 0.25)';
  } else {
    primaryColor = 'rgba(130, 243, 208, 0.75)';
    glowColor = 'rgba(130, 243, 208, 0.4)';
    bgGradientStart = 'rgba(130, 243, 208, 0.12)';
  }

  const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, baseRadius + 35);
  gradient.addColorStop(0, bgGradientStart);
  gradient.addColorStop(0.75, bgGradientStart.replace(/[\d\.]+\)$/, '0.03)'));
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius + 35, 0, Math.PI * 2);
  ctx.fill();

  const points = 40;

  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wave1 = Math.sin(angle * 5 + time * 3) * (audioLevel * 0.2 + 4);
    const wave2 = Math.cos(angle * 3 - time * 2) * 3;
    const r = (baseRadius - 10) + wave1 + wave2;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = primaryColor;
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wave1 = Math.sin(angle * 6 + time * 3.5) * (audioLevel * 0.35 + 4);
    const wave2 = Math.sin(angle * 2 - time * 1.5) * 3;
    const r = baseRadius + wave1 + wave2;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = primaryColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.stroke();

  ctx.restore();
}

function startCanvasVisualizer() {
  const canvas = document.getElementById('voice-canvas-visualizer');
  if (!canvas) return;
  
  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
  }
  
  function animate() {
    const level = voiceEngineInstance ? voiceEngineInstance.volumeLevel : 0;
    const isListening = voiceEngineInstance ? voiceEngineInstance.isListening : false;
    const isSpeaking = voiceEngineInstance ? voiceEngineInstance.isSpeaking : false;
    
    renderCanvasAudioWave(canvas, level, isListening, isSpeaking);
    visualizerAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

function stopCanvasVisualizer() {
  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
    visualizerAnimationId = null;
  }
  const canvas = document.getElementById('voice-canvas-visualizer');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

if (typeof window !== 'undefined') {
  window.VoiceEngine = VoiceEngine;
}
const voiceBtn = document.getElementById('voiceBtn');
const stopVoiceBtn = document.getElementById('stopVoiceBtn');
const consultarBtn = document.querySelector('.button-group button:nth-child(2)');
let recognizing = false;
let recognition;
let waitingForQuestion = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    recognizing = true;
    voiceBtn.textContent = 'Parar Voz';
  };

  recognition.onend = () => {
    if (recognizing) {
      recognition.start();
    } else {
      voiceBtn.textContent = 'Iniciar Voz';
    }
  };

  recognition.onresult = (event) => {
    const transcriptRaw = event.results[0][0].transcript;
    const transcript = transcriptRaw.toUpperCase();
    document.getElementById('userInput').value = transcriptRaw;

    const requiredWords = ["NEXUM", "INICIAR", "DIAGNÓSTICO"];
    if (!waitingForQuestion && requiredWords.every(word => transcript.includes(word))) {
      const respostaDiv = document.getElementById("resposta");
      respostaDiv.innerHTML = "<strong>Bem-vindo! Em que posso ajudar?</strong>";
      document.getElementById("userInput").value = "";

      // Stop any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Speak welcome message
      const welcomeText = "Bem-vindo, em que posso ajudar?";
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.lang = 'pt-BR';

      // Select a more human-like voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoices = voices.filter(voice => voice.lang === 'pt-BR' || voice.lang.startsWith('pt'));
      if (ptBrVoices.length > 0) {
        const preferredVoice = ptBrVoices.find(v => /Google|Microsoft/i.test(v.name)) || ptBrVoices[0];
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.2;
      utterance.pitch = 1.1;

      utterance.onstart = () => {
        startSoundWaveAnimation();
      };
      utterance.onend = () => {
        stopSoundWaveAnimation();
        waitingForQuestion = true;
      };

      window.speechSynthesis.speak(utterance);
    } else if (waitingForQuestion) {
      waitingForQuestion = false;
      consultarIA(transcriptRaw);
    }
  };
  
  // Enhanced holoCanvas animation setup
  const canvas = document.getElementById('holoCanvas');
  const ctx = canvas.getContext('2d');
  let animationId;
  let wavePhase = 0;
  let radarAngle = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawRadarSweep() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.8;

    // Draw concentric circles
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 5) * i, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw radial lines
    for (let i = 0; i < 12; i++) {
      const angle = (i * 2 * Math.PI) / 12;
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Draw rotating radar sweep
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, maxRadius, radarAngle, radarAngle + Math.PI / 6);
    ctx.closePath();
    ctx.fill();

    radarAngle += 0.02;

    // Draw sine wave at bottom
    const waveAmplitude = 20;
    const waveFrequency = 0.03;
    const waveY = canvas.height * 0.85;

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const y = waveY + waveAmplitude * Math.sin(waveFrequency * (x + wavePhase));
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    wavePhase += 4;

    animationId = requestAnimationFrame(drawRadarSweep);
  }

  function startSoundWaveAnimation() {
    if (!animationId) {
      drawRadarSweep();
    }
  }

  function stopSoundWaveAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      // Ignore no-speech errors silently
      return;
    }
    console.error('Erro no reconhecimento de voz:', event.error);
    recognizing = false;
    voiceBtn.textContent = 'Iniciar Voz';

    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      alert('Permissão para acessar o microfone negada. Por favor, permita o acesso ao microfone para usar o reconhecimento de voz.');
    }
  };
} else {
  alert('Reconhecimento de voz não suportado neste navegador.');
}

voiceBtn.addEventListener('click', () => {
  if (recognizing) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

window.addEventListener('load', () => {
  recognition.start();
});

stopVoiceBtn.addEventListener('click', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});

consultarBtn.addEventListener('click', () => {
  consultarIA();
});

window.consultarIA = consultarIA;

async function consultarIA(userInputParam) {
  const userInput = userInputParam || document.getElementById("userInput").value;
  const respostaDiv = document.getElementById("resposta");
  respostaDiv.innerHTML = "Consultando IA...";
  consultarBtn.disabled = true;

  // Stop any ongoing speech synthesis before starting a new one
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  try {
    const response = await fetch("https://eletroia-gpt-4-project.vercel.app/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: userInput })
    });

    if (!response.ok) {
      // Clone response to read body multiple times safely
      const responseClone = response.clone();
      let errorMsg = "Erro na requisição";
      try {
        const errorData = await responseClone.json();
        errorMsg = errorData.erro || errorMsg;
      } catch {
        const errorText = await responseClone.text();
        errorMsg = errorText || errorMsg;
      }
      respostaDiv.innerHTML = `Erro: ${errorMsg}`;
      consultarBtn.disabled = false;
      return;
    }

    const data = await response.json();

    respostaDiv.innerHTML = `<strong>Resposta da IA:</strong><br>${data.resposta}`;
    document.getElementById("userInput").value = "";

    // Speech synthesis
    if ('speechSynthesis' in window) {
      // Remove asterisks from the response text before speech synthesis
      const cleanText = data.resposta.replace(/\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';

      // Select a more human-like voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoices = voices.filter(voice => voice.lang === 'pt-BR' || voice.lang.startsWith('pt'));
      if (ptBrVoices.length > 0) {
        const preferredVoice = ptBrVoices.find(v => /Google|Microsoft/i.test(v.name)) || ptBrVoices[0];
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.2; // Increase speech rate to make voice faster
      utterance.pitch = 1.1; // Slightly increase pitch for naturalness
      window.speechSynthesis.speak(utterance);
    }

  } catch (error) {
    respostaDiv.innerHTML = "Erro ao consultar a IA. Verifique se o servidor backend está rodando e tente novamente.";
    console.error(error);
  } finally {
    consultarBtn.disabled = false;
  }
}

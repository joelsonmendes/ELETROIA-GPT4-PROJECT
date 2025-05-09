const voiceBtn = document.getElementById('voiceBtn');
const stopVoiceBtn = document.getElementById('stopVoiceBtn');
const consultarBtn = document.querySelector('.button-group button:nth-child(2)');
const clearChatBtn = document.getElementById('clear-chat');
const typingIndicator = document.getElementById('typing-indicator');

let recognizing = false;
let recognition;
let waitingForQuestion = false;

let conversation = [];

// Load conversation from localStorage on page load
window.addEventListener('load', () => {
  loadConversation();
  if (recognition) {
    recognition.start();
  }
});

function saveConversation() {
  localStorage.setItem('eletroia-conversation', JSON.stringify(conversation));
}

function loadConversation() {
  const saved = localStorage.getItem('eletroia-conversation');
  if (saved) {
    conversation = JSON.parse(saved);
    conversation.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
      }
    });
  }
}

function appendMessage(role, content) {
  const respostaDiv = document.getElementById('resposta');
  const messageElem = document.createElement('div');
  messageElem.className = role === 'user' ? 'user-message' : 'bot-message';
  messageElem.textContent = content;
  respostaDiv.appendChild(messageElem);
  respostaDiv.scrollTop = respostaDiv.scrollHeight;
}

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

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const welcomeText = "Bem-vindo, em que posso ajudar?";
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.lang = 'pt-BR';

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

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
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

stopVoiceBtn.addEventListener('click', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});

consultarBtn.addEventListener('click', () => {
  consultarIA();
});

if (clearChatBtn) {
  clearChatBtn.addEventListener('click', () => {
    conversation = [];
    localStorage.removeItem('eletroia-conversation');
    const respostaDiv = document.getElementById('resposta');
    respostaDiv.innerHTML = '';
    appendMessage('bot', 'Conversa limpa. Como posso ajudá-lo?');
  });
}

async function consultarIA(userInputParam) {
  const userInput = userInputParam || document.getElementById("userInput").value;
  const respostaDiv = document.getElementById("resposta");
  respostaDiv.innerHTML = "";
  consultarBtn.disabled = true;
  typingIndicator.style.display = "flex";

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // Add user message to conversation and save
  conversation.push({ role: "user", content: userInput });
  saveConversation();

  // Truncate conversation to last 10 messages
  if (conversation.length > 10) {
    conversation = conversation.slice(conversation.length - 10);
  }

  try {
    const response = await fetch("https://eletroia-gpt-4-project.vercel.app/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: userInput })
    });

    if (!response.ok) {
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
      typingIndicator.style.display = "none";
      return;
    }

    const data = await response.json();

    // Add assistant message to conversation and save
    conversation.push({ role: "assistant", content: data.resposta });
    saveConversation();

    appendMessage('bot', data.resposta);
    document.getElementById("userInput").value = "";

    if ('speechSynthesis' in window) {
      const cleanText = data.resposta.replace(/\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';

      const voices = window.speechSynthesis.getVoices();
      const ptBrVoices = voices.filter(voice => voice.lang === 'pt-BR' || voice.lang.startsWith('pt'));
      if (ptBrVoices.length > 0) {
        const preferredVoice = ptBrVoices.find(v => /Google|Microsoft/i.test(v.name)) || ptBrVoices[0];
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }

  } catch (error) {
    respostaDiv.innerHTML = "Erro ao consultar a IA. Verifique se o servidor backend está rodando e tente novamente.";
    console.error(error);
  } finally {
    consultarBtn.disabled = false;
    typingIndicator.style.display = "none";
  }
}

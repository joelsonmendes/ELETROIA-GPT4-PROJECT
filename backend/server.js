import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import serverless from "serverless-http";

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

const modelInUse = process.env.GROQ_MODEL || "mixtral-8x7b-32768";
console.log(`Modelo Groq em uso: ${modelInUse}`);

if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === "") {
  console.warn("AVISO: A variável de ambiente GROQ_API_KEY não está definida ou está vazia. A API não funcionará sem uma chave válida.");
}

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // limita cada IP a 30 requisições por janela
  message: { erro: "Muitas requisições, por favor tente novamente mais tarde." }
});
app.use(limiter);

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to check environment variables status
app.get("/envcheck", (req, res) => {
  const apiKeySet = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "";
  res.json({
    apiKeySet,
    message: apiKeySet ? "Chave da API carregada." : "Chave da API não está definida ou está vazia."
  });
});

// Endpoint to get current model info
app.get("/models", (req, res) => {
  const currentModel = process.env.GROQ_MODEL || "gpt-3.5-turbo"; // default fallback
  // In real scenario, you might fetch supported models from Groq API
  res.json({ currentModel, message: "Atualize a variável de ambiente GROQ_MODEL com o modelo correto conforme a documentação Groq." });
});

app.post("/ia", async (req, res) => {
  const mensagem = req.body.mensagem;

  if (!mensagem || typeof mensagem !== "string" || mensagem.trim() === "") {
    return res.status(400).json({ erro: "Mensagem inválida ou vazia." });
  }

  try {
    const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        messages: [{ role: "user", content: mensagem }],
        temperature: 0.7
      })
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error(`Erro da API externa: ${resposta.status} - ${erroTexto}`);
      return res.status(resposta.status).json({ erro: erroTexto });
    }

    const dados = await resposta.json();
    const respostaIA = dados.choices[0].message.content;
    res.json({ resposta: respostaIA });

  } catch (erro) {
    console.error("Erro ao consultar a IA:", erro);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

export default serverless(app);
